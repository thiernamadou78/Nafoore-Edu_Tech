import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CurrentTeacherAccount } from '../auth/current-teacher-account.decorator';
import { AuthenticatedTeacherAccount, TeacherAuthGuard } from '../auth/teacher-auth.guard';
import { AdminNotificationService } from '../email/admin-notification.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTeacherDocumentDto, TEACHER_DOCUMENT_TYPES } from './dto/create-teacher-document.dto';
import { TeacherDocumentsService } from './teacher-documents.service';

const TYPE_LABELS: Record<(typeof TEACHER_DOCUMENT_TYPES)[number], string> = {
  cv: 'CV',
  piece_identite: "Pièce d'identité",
  diplome: 'Diplôme',
  casier_judiciaire: 'Casier judiciaire',
  autre: 'Autre document',
};

// Portail enseignant : l'enseignant depose lui-meme ses documents (CV,
// piece d'identite, diplomes, casier). Il voit la liste de ce qu'il a
// fourni ; consultation et suppression restent reservees a l'equipe.
@UseGuards(TeacherAuthGuard)
@Controller('teacher/documents')
export class TeacherPortalDocumentsController {
  constructor(
    private readonly documents: TeacherDocumentsService,
    private readonly prisma: PrismaService,
    private readonly adminNotifications: AdminNotificationService,
  ) {}

  private teacherIdOf(account: AuthenticatedTeacherAccount) {
    if (!account.teacherId) throw new NotFoundException('Profil enseignant introuvable');
    return account.teacherId;
  }

  @Get()
  async list(@CurrentTeacherAccount() account: AuthenticatedTeacherAccount) {
    const rows = await this.documents.list(this.teacherIdOf(account));
    return rows.map((doc) => ({ id: doc.id, type: doc.type, fileName: doc.fileName, createdAt: doc.createdAt }));
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateTeacherDocumentDto,
    @CurrentTeacherAccount() account: AuthenticatedTeacherAccount,
  ) {
    const teacherId = this.teacherIdOf(account);
    const doc = await this.documents.upload(teacherId, file, dto, null);
    const teacher = await this.prisma.teacher.findUnique({ where: { id: teacherId }, select: { name: true } });
    this.adminNotifications.notify({
      subject: `Document déposé par ${teacher?.name ?? 'un enseignant'}`,
      title: `${TYPE_LABELS[dto.type as keyof typeof TYPE_LABELS] ?? 'Document'} déposé par ${teacher?.name ?? 'un enseignant'}`,
      lines: [`Fichier : ${doc.fileName}`, 'Déposé depuis le portail enseignant.'],
      path: `/enseignants/${teacherId}`,
    });
    return { id: doc.id, type: doc.type, fileName: doc.fileName, createdAt: doc.createdAt };
  }
}
