import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseAdminService } from '../auth/supabase-admin.service';
import { EmailService } from '../email/email.service';
import { PhotosService } from '../photos/photos.service';
import { AdminNotificationService } from '../email/admin-notification.service';
import { renderApplicationReceivedEmail } from '../email/templates/application-received.template';
import { generateCompletionToken } from '../teacher-applications/completion-token.util';
import { CreatePublicTeacherApplicationDto } from './dto/create-public-teacher-application.dto';
import { UpdateCompletionProfileDto } from './dto/update-completion-profile.dto';

const BUCKET = 'teacher-application-documents';

// Classes valides par niveau — sert a verifier qu'un niveau coche a bien au
// moins une classe precisee (voir create()).
const CLASSES_BY_LEVEL: Record<string, string[]> = {
  primaire: ['cp', 'ce1', 'ce2', 'cm1', 'cm2'],
  college: ['6e', '5e', '4e', '3e'],
  lycee: ['2nde', '1re', 'terminale'],
};

export interface TeacherApplicationUploadedFiles {
  diplomas?: Express.Multer.File[];
  criminalRecord?: Express.Multer.File[];
}

@Injectable()
export class TeacherApplicationsPublicService {
  private readonly logger = new Logger(TeacherApplicationsPublicService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly supabaseAdmin: SupabaseAdminService,
    private readonly emailService: EmailService,
    private readonly photos: PhotosService,
    private readonly adminNotification: AdminNotificationService,
  ) {}

  private async findByToken(token: string) {
    const application = await this.prisma.teacherApplication.findUnique({
      where: { completionToken: token },
      include: { documents: { orderBy: { createdAt: 'desc' } } },
    });
    if (!application) {
      throw new NotFoundException('Candidature introuvable');
    }
    return application;
  }

  private assertEditable(status: string) {
    if (status === 'valide' || status === 'refuse') {
      throw new BadRequestException("Cette candidature n'est plus modifiable");
    }
  }

  async getByToken(token: string) {
    const application = await this.findByToken(token);
    const photoUrl = await this.photos.signUrl(application.photoPath);
    return { ...application, photoUrl };
  }

  async updateProfile(token: string, dto: UpdateCompletionProfileDto) {
    const application = await this.findByToken(token);
    this.assertEditable(application.status);
    return this.prisma.teacherApplication.update({
      where: { id: application.id },
      data: { bio: dto.bio },
    });
  }

  async addDocuments(token: string, files: TeacherApplicationUploadedFiles) {
    const application = await this.findByToken(token);
    this.assertEditable(application.status);
    await this.uploadDocuments(application.id, files);
    return this.findByToken(token);
  }

  private async uploadDocuments(applicationId: string, files: TeacherApplicationUploadedFiles) {
    const uploads = [
      ...(files.diplomas ?? []).map((file) => ({ file, type: 'diplome' })),
      ...(files.criminalRecord ?? []).map((file) => ({ file, type: 'casier_judiciaire' })),
    ];

    for (const { file, type } of uploads) {
      const filePath = `${applicationId}/${randomUUID()}-${file.originalname}`;
      const { error } = await this.supabaseAdmin.client.storage
        .from(BUCKET)
        .upload(filePath, file.buffer, { contentType: file.mimetype });
      if (error) {
        this.logger.error(
          `Échec d'upload du document "${file.originalname}" pour la candidature ${applicationId}: ${error.message}`,
        );
        continue;
      }
      await this.prisma.teacherApplicationDocument.create({
        data: {
          teacherApplicationId: applicationId,
          type,
          fileName: file.originalname,
          filePath,
        },
      });
    }
  }

  async create(dto: CreatePublicTeacherApplicationDto, files: TeacherApplicationUploadedFiles) {
    for (const level of dto.levels) {
      const validClasses = CLASSES_BY_LEVEL[level] ?? [];
      if (!dto.classes.some((classe) => validClasses.includes(classe))) {
        throw new BadRequestException(
          `Précisez au moins une classe pour le niveau "${level}"`,
        );
      }
    }

    const application = await this.prisma.teacherApplication.create({
      data: {
        candidateName: dto.candidateName,
        gender: dto.gender,
        candidateEmail: dto.candidateEmail,
        phone: dto.phone,
        subjects: dto.subjects,
        levels: dto.levels,
        classes: dto.classes,
        zone: dto.zone,
        postalCode: dto.postalCode,
        bio: dto.bio.trim(),
        availability: dto.availability,
        completionToken: generateCompletionToken(),
      },
    });

    await this.uploadDocuments(application.id, files);

    this.adminNotification.notify({
      subject: `Nouvelle candidature : ${dto.candidateName}`,
      title: 'Nouvelle candidature enseignant',
      lines: [
        `Candidat : ${dto.candidateName}`,
        `Email : ${dto.candidateEmail}`,
        `Téléphone : ${dto.phone}`,
        `Matières : ${dto.subjects.join(', ')}`,
        `Zone : ${dto.zone} (${dto.postalCode})`,
      ],
      path: `/recrutement/${application.id}`,
    });

    try {
      const result = await this.emailService.send({
        to: dto.candidateEmail,
        subject: 'Nafoore Education — Votre candidature a bien été reçue',
        html: renderApplicationReceivedEmail({ fullName: dto.candidateName, gender: dto.gender }),
      });
      this.logger.log(
        `Email d'accusé de réception envoyé (${result.providerId ?? 'n/a'})`,
      );
    } catch (sendError) {
      this.logger.error(
        `Échec d'envoi de l'accusé de réception pour la candidature ${application.id}`,
        sendError instanceof Error ? sendError.stack : undefined,
      );
    }

    return { id: application.id };
  }
}
