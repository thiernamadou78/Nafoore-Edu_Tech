import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { PhotosService } from '../photos/photos.service';
import { EmailService } from '../email/email.service';
import { resolvePortalUrl } from '../email/portal-url.util';
import { renderDocumentsRequiredEmail } from '../email/templates/documents-required.template';
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

  async decide(
    id: string,
    status: 'valide' | 'refuse' | 'documents_requis',
    actorId: string,
  ) {
    const existing = await this.findOne(id);

    if (status === 'valide' && (!existing.bio || !existing.photoPath)) {
      throw new BadRequestException(
        'Le profil du candidat (photo + bio) doit être complété avant de valider la candidature',
      );
    }

    const application = await this.prisma.$transaction(async (tx) => {
      let createdTeacherId = existing.createdTeacherId;

      if (status === 'valide' && !createdTeacherId) {
        const teacher = await tx.teacher.create({
          data: {
            name: existing.candidateName,
            subjects: existing.subjects,
            bio: existing.bio,
            photoPath: existing.photoPath,
            verified: true,
          },
        });
        createdTeacherId = teacher.id;
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
            fullName: existing.candidateName,
            completionUrl,
          }),
        })
        .catch((error) => {
          this.logger.error(
            `Échec d'envoi de l'email "documents requis" pour la candidature ${id}`,
            error instanceof Error ? error.stack : undefined,
          );
        });
    }

    return application;
  }
}
