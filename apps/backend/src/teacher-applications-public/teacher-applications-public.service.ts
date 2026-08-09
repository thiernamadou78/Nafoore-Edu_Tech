import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseAdminService } from '../auth/supabase-admin.service';
import { EmailService } from '../email/email.service';
import { renderApplicationReceivedEmail } from '../email/templates/application-received.template';
import { CreatePublicTeacherApplicationDto } from './dto/create-public-teacher-application.dto';

const BUCKET = 'teacher-application-documents';

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
  ) {}

  async create(dto: CreatePublicTeacherApplicationDto, files: TeacherApplicationUploadedFiles) {
    const application = await this.prisma.teacherApplication.create({
      data: {
        candidateName: dto.candidateName,
        candidateEmail: dto.candidateEmail,
        phone: dto.phone,
        subjects: dto.subjects,
        levels: dto.levels,
        zone: dto.zone,
        availability: dto.availability,
      },
    });

    const uploads = [
      ...(files.diplomas ?? []).map((file) => ({ file, type: 'diplome' })),
      ...(files.criminalRecord ?? []).map((file) => ({ file, type: 'casier_judiciaire' })),
    ];

    for (const { file, type } of uploads) {
      const filePath = `${application.id}/${randomUUID()}-${file.originalname}`;
      const { error } = await this.supabaseAdmin.client.storage
        .from(BUCKET)
        .upload(filePath, file.buffer, { contentType: file.mimetype });
      if (error) {
        this.logger.error(
          `Échec d'upload du document "${file.originalname}" pour la candidature ${application.id}: ${error.message}`,
        );
        continue;
      }
      await this.prisma.teacherApplicationDocument.create({
        data: {
          teacherApplicationId: application.id,
          type,
          fileName: file.originalname,
          filePath,
        },
      });
    }

    try {
      const result = await this.emailService.send({
        to: dto.candidateEmail,
        subject: 'Nafoore — Votre candidature a bien été reçue',
        html: renderApplicationReceivedEmail({ fullName: dto.candidateName }),
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
