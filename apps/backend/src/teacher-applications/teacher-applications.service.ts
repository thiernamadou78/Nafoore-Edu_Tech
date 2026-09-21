import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { PhotosService } from '../photos/photos.service';
import { DAYS_OF_WEEK } from '../common/days';
import { EmailService } from '../email/email.service';
import { GeocodingService } from '../geocoding/geocoding.service';
import { TeacherOnboardingService } from '../onboarding/teacher-onboarding.service';
import { resolvePortalUrl } from '../email/portal-url.util';
import { renderDocumentsRequiredEmail } from '../email/templates/documents-required.template';
import { renderInterviewScheduledEmail } from '../email/templates/interview-scheduled.template';
import { generateCompletionToken } from './completion-token.util';
import { CreateTeacherApplicationDto } from './dto/create-teacher-application.dto';
import { ListTeacherApplicationsQueryDto } from './dto/list-teacher-applications-query.dto';
import { UpdateTeacherApplicationProfileDto } from './dto/update-teacher-application-profile.dto';

@Injectable()
export class TeacherApplicationsService {
  private readonly logger = new Logger(TeacherApplicationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLog: ActivityLogService,
    private readonly photos: PhotosService,
    private readonly emailService: EmailService,
    private readonly geocoding: GeocodingService,
    private readonly teacherOnboarding: TeacherOnboardingService,
  ) {}

  list(query: ListTeacherApplicationsQueryDto) {
    const where: Prisma.TeacherApplicationWhereInput = {
      status: query.status,
      zone: query.zone ? { equals: query.zone, mode: 'insensitive' } : undefined,
      subjects: query.subject ? { has: query.subject } : undefined,
      reviewedById: query.reviewedBy,
    };

    return this.prisma.teacherApplication.findMany({
      where,
      include: { reviewedBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const application = await this.prisma.teacherApplication.findUnique({
      where: { id },
      include: {
        reviewedBy: { select: { id: true, name: true } },
        documents: { orderBy: { createdAt: 'desc' } },
        teacherAccount: { select: { id: true, status: true, mustChangePassword: true } },
      },
    });
    if (!application) {
      throw new NotFoundException('Candidature introuvable');
    }
    const photoUrl = await this.photos.signUrl(application.photoPath);
    return { ...application, photoUrl };
  }

  create(dto: CreateTeacherApplicationDto) {
    return this.prisma.teacherApplication.create({
      data: { ...dto, completionToken: generateCompletionToken() },
    });
  }

  async scheduleInterview(id: string, interviewDate: string, actorId: string) {
    await this.findOne(id);

    const application = await this.prisma.teacherApplication.update({
      where: { id },
      data: {
        interviewDate: new Date(interviewDate),
        status: 'entretien_planifie',
        reviewedById: actorId,
      },
    });

    await this.activityLog.log(
      actorId,
      'schedule_teacher_interview',
      'teacher_applications',
      id,
    );

    this.emailService
      .send({
        to: application.candidateEmail,
        subject: 'Nafoore Education — Votre entretien est planifié',
        html: renderInterviewScheduledEmail({
          gender: application.gender,
          fullName: application.candidateName,
          interviewDate: application.interviewDate as Date,
        }),
      })
      .catch((error) => {
        this.logger.error(
          `Échec d'envoi de l'email de planification d'entretien pour la candidature ${id}`,
          error instanceof Error ? error.stack : undefined,
        );
      });

    return application;
  }

  async updateNotes(id: string, interviewNotes: string, actorId: string) {
    const existing = await this.findOne(id);
    const nextStatus =
      existing.status === 'preselection' || existing.status === 'entretien_planifie'
        ? 'entretien_realise'
        : existing.status;

    const application = await this.prisma.teacherApplication.update({
      where: { id },
      data: { interviewNotes, status: nextStatus, reviewedById: actorId },
    });

    await this.activityLog.log(
      actorId,
      'update_teacher_application_notes',
      'teacher_applications',
      id,
    );

    return application;
  }

  async updateProfile(id: string, dto: UpdateTeacherApplicationProfileDto, actorId: string) {
    await this.findOne(id);

    const application = await this.prisma.teacherApplication.update({
      where: { id },
      data: { bio: dto.bio },
    });

    await this.activityLog.log(
      actorId,
      'update_teacher_application_profile',
      'teacher_applications',
      id,
    );

    return application;
  }

  async uploadPhoto(id: string, file: Express.Multer.File) {
    const application = await this.findOne(id);
    if (application.photoPath) {
      await this.photos.remove(application.photoPath);
    }
    const path = this.photos.buildPath('teacher-applications', id, file.originalname);
    await this.photos.upload(path, file);
    await this.prisma.teacherApplication.update({ where: { id }, data: { photoPath: path } });
  }

  async removePhoto(id: string) {
    const application = await this.findOne(id);
    if (application.photoPath) {
      await this.photos.remove(application.photoPath);
      await this.prisma.teacherApplication.update({ where: { id }, data: { photoPath: null } });
    }
  }

  private listMissingItems(application: {
    bio: string | null;
    documents: { type: string }[];
  }): string[] {
    const missing: string[] = [];
    if (!application.bio || application.bio.trim().length < 20) {
      missing.push('Présentation (20 caractères minimum)');
    }
    if (!application.documents.some((doc) => doc.type === 'diplome')) missing.push('Diplôme');
    if (!application.documents.some((doc) => doc.type === 'casier_judiciaire')) {
      missing.push('Casier judiciaire (bulletin n°3)');
    }
    return missing;
  }

  async decide(
    id: string,
    status: 'valide' | 'refuse' | 'documents_requis',
    actorId: string,
  ) {
    const existing = await this.findOne(id);

    if (status === 'valide' && !existing.bio) {
      throw new BadRequestException(
        'La présentation du candidat doit être renseignée avant de valider la candidature',
      );
    }

    const missingItems = status === 'documents_requis' ? this.listMissingItems(existing) : [];
    if (status === 'documents_requis' && missingItems.length === 0) {
      throw new BadRequestException(
        'Le dossier est déjà complet : il ne manque aucun document, ni photo, ni présentation',
      );
    }

    const application = await this.prisma.$transaction(async (tx) => {
      let createdTeacherId = existing.createdTeacherId;

      if (status === 'valide' && !createdTeacherId) {
        const teacher = await tx.teacher.create({
          data: {
            name: existing.candidateName,
            gender: existing.gender,
            subjects: existing.subjects,
            bio: existing.bio,
            photoPath: existing.photoPath,
            email: existing.candidateEmail,
            phone: existing.phone,
            address: existing.zone,
            postalCode: existing.postalCode,
            city: existing.city,
            availabilityDays: DAYS_OF_WEEK.filter((day) => existing.availability?.includes(day)),
            verified: true,
          },
        });
        createdTeacherId = teacher.id;
        if (existing.zone) {
          this.geocoding
            .geocode(existing.zone, existing.postalCode)
            .then((coords) => {
              if (!coords) return;
              return this.prisma.teacher.update({ where: { id: teacher.id }, data: coords });
            })
            .catch((error) =>
              this.logger.warn(`Géocodage de l'enseignant ${teacher.id} échoué: ${error}`),
            );
        }
      } else if (status === 'valide' && createdTeacherId) {
        await tx.teacher.update({
          where: { id: createdTeacherId },
          data: { verified: true },
        });
      }

      return tx.teacherApplication.update({
        where: { id },
        data: {
          status,
          decidedAt: new Date(),
          reviewedById: actorId,
          createdTeacherId,
        },
      });
    });

    await this.activityLog.log(
      actorId,
      `decide_teacher_application_${status}`,
      'teacher_applications',
      id,
    );

    if (status === 'documents_requis') {
      const completionUrl = `${resolvePortalUrl('public')}/candidature/completer/${existing.completionToken}`;
      this.emailService
        .send({
          to: existing.candidateEmail,
          subject: 'Nafoore Education — Votre candidature nécessite des documents complémentaires',
          html: renderDocumentsRequiredEmail({
            gender: existing.gender,
            fullName: existing.candidateName,
            completionUrl,
            missingItems,
          }),
        })
        .catch((error) => {
          this.logger.error(
            `Échec d'envoi de l'email "documents requis" pour la candidature ${id}`,
            error instanceof Error ? error.stack : undefined,
          );
        });
    }

    if (status === 'valide' && !existing.teacherAccount) {
      // Cree le compte (Supabase Auth + TeacherAccount) et envoie l'email de
      // bienvenue avec le mot de passe temporaire — auparavant seulement
      // declenchable manuellement via "Creer le compte", ce qui faisait que
      // la validation ne notifiait jamais le prof. On a deja verifie
      // ci-dessus qu'aucun compte n'existe encore pour CETTE candidature,
      // donc toute erreur ici (ex: email deja utilise par un autre compte)
      // est une vraie collision — trop importante pour etre ignoree
      // silencieusement, meme si on reste best-effort (une candidature
      // validee ne doit jamais echouer a cause d'un souci de compte).
      this.teacherOnboarding.createAccount(id, actorId).catch((error) => {
        this.logger.error(
          `Échec de la création automatique du compte enseignant pour la candidature ${id}`,
          error instanceof Error ? error.stack : undefined,
        );
      });
    }

    return application;
  }
}
