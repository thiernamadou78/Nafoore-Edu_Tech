import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseAdminService } from '../auth/supabase-admin.service';
import { loadDocumentForView } from '../common/document-view';
import { assertFileSignature, DOCUMENT_MIME_TYPES, safeFileName } from '../common/file-signature';
import { CreateDocumentDto } from './dto/create-document.dto';

const BUCKET = 'student-documents';

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
    // Documents consultables a l'ecran : PDF, JPG ou PNG verifies sur leur
    // contenu reel (pas seulement l'extension).
    const contentType = assertFileSignature(file, DOCUMENT_MIME_TYPES, 'PDF, JPG ou PNG');
    const filePath = `${studentId}/${randomUUID()}-${safeFileName(file.originalname)}`;

    const { error } = await this.supabaseAdmin.client.storage
      .from(BUCKET)
      .upload(filePath, file.buffer, { contentType });
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

  // Consultation a l'ecran uniquement (voir common/document-view.ts).
  async getFileForView(studentId: string, documentId: string) {
    const document = await this.findOwned(studentId, documentId);
    return loadDocumentForView(
      this.supabaseAdmin.client,
      BUCKET,
      document.filePath,
      document.fileName,
    );
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
