import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseAdminService } from '../auth/supabase-admin.service';
import { CreateTeacherDocumentDto } from './dto/create-teacher-document.dto';

const BUCKET = 'teacher-documents';
const DOWNLOAD_URL_TTL_SECONDS = 60 * 5;

const uploaderSelect = { uploadedBy: { select: { id: true, name: true } } };

@Injectable()
export class TeacherDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly supabaseAdmin: SupabaseAdminService,
  ) {}

  list(teacherId: string) {
    return this.prisma.teacherDocument.findMany({
      where: { teacherId },
      include: uploaderSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  async upload(
    teacherId: string,
    file: Express.Multer.File,
    dto: CreateTeacherDocumentDto,
    actorId: string,
  ) {
    const filePath = `${teacherId}/${randomUUID()}-${file.originalname}`;

    const { error } = await this.supabaseAdmin.client.storage
      .from(BUCKET)
      .upload(filePath, file.buffer, { contentType: file.mimetype });
    if (error) {
      throw error;
    }

    return this.prisma.teacherDocument.create({
      data: {
        teacherId,
        uploadedById: actorId,
        type: dto.type,
        fileName: file.originalname,
        filePath,
      },
      include: uploaderSelect,
    });
  }

  async getDownloadUrl(teacherId: string, documentId: string) {
    const document = await this.findOwned(teacherId, documentId);

    const { data, error } = await this.supabaseAdmin.client.storage
      .from(BUCKET)
      .createSignedUrl(document.filePath, DOWNLOAD_URL_TTL_SECONDS);
    if (error || !data) {
      throw error ?? new Error('Échec de génération du lien de téléchargement');
    }

    return { url: data.signedUrl };
  }

  async remove(teacherId: string, documentId: string) {
    const document = await this.findOwned(teacherId, documentId);
    await this.supabaseAdmin.client.storage.from(BUCKET).remove([document.filePath]);
    await this.prisma.teacherDocument.delete({ where: { id: documentId } });
  }

  private async findOwned(teacherId: string, documentId: string) {
    const document = await this.prisma.teacherDocument.findFirst({
      where: { id: documentId, teacherId },
    });
    if (!document) {
      throw new NotFoundException('Document introuvable');
    }
    return document;
  }
}
