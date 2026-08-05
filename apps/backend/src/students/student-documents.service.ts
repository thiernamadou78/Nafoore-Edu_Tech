import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseAdminService } from '../auth/supabase-admin.service';
import { CreateDocumentDto } from './dto/create-document.dto';

const BUCKET = 'student-documents';
const DOWNLOAD_URL_TTL_SECONDS = 60 * 5;

const uploaderSelect = { uploadedBy: { select: { id: true, name: true } } };

@Injectable()
export class StudentDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly supabaseAdmin: SupabaseAdminService,
  ) {}

  list(studentId: string) {
    return this.prisma.studentDocument.findMany({
      where: { studentId },
      include: uploaderSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  async upload(
    studentId: string,
    file: Express.Multer.File,
    dto: CreateDocumentDto,
    actorId: string,
  ) {
    const filePath = `${studentId}/${randomUUID()}-${file.originalname}`;

    const { error } = await this.supabaseAdmin.client.storage
      .from(BUCKET)
      .upload(filePath, file.buffer, { contentType: file.mimetype });
    if (error) {
      throw error;
    }

    return this.prisma.studentDocument.create({
      data: {
        studentId,
        uploadedById: actorId,
        type: dto.type,
        fileName: file.originalname,
        filePath,
      },
      include: uploaderSelect,
    });
  }

  async getDownloadUrl(studentId: string, documentId: string) {
    const document = await this.findOwned(studentId, documentId);

    const { data, error } = await this.supabaseAdmin.client.storage
      .from(BUCKET)
      .createSignedUrl(document.filePath, DOWNLOAD_URL_TTL_SECONDS);
    if (error || !data) {
      throw error ?? new Error('Échec de génération du lien de téléchargement');
    }

    return { url: data.signedUrl };
  }

  async remove(studentId: string, documentId: string) {
    const document = await this.findOwned(studentId, documentId);
    await this.supabaseAdmin.client.storage.from(BUCKET).remove([document.filePath]);
    await this.prisma.studentDocument.delete({ where: { id: documentId } });
  }

  private async findOwned(studentId: string, documentId: string) {
    const document = await this.prisma.studentDocument.findFirst({
      where: { id: documentId, studentId },
    });
    if (!document) {
      throw new NotFoundException('Document introuvable');
    }
    return document;
  }
}
