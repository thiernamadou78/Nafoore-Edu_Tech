import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseAdminService } from '../auth/supabase-admin.service';
import { loadDocumentForView } from '../common/document-view';
import { assertFileSignature, DOCUMENT_MIME_TYPES, safeFileName } from '../common/file-signature';
import { assertNoDuplicateDocuments, fileHash } from '../common/file-hash';
import { CreateTeacherDocumentDto } from './dto/create-teacher-document.dto';

const BUCKET = 'teacher-documents';

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
    // null : depose par l'enseignant depuis son portail.
    actorId: string | null,
  ) {
    if (!file) throw new BadRequestException('Aucun fichier reçu');
    // Documents consultables a l'ecran : PDF, JPG ou PNG verifies sur leur
    // contenu reel (pas seulement l'extension).
    const contentType = assertFileSignature(file, DOCUMENT_MIME_TYPES, 'PDF, JPG ou PNG');
    // Meme fichier deja dans le dossier (documents de l'enseignant ou de sa
    // candidature) : refuse, quel que soit son nom.
    const hash = fileHash(file.buffer);
    const [own, application] = await Promise.all([
      this.prisma.teacherDocument.findMany({
        where: { teacherId },
        select: { contentHash: true, type: true, fileName: true },
      }),
      this.prisma.teacherApplication.findFirst({
        where: { createdTeacherId: teacherId },
        select: { documents: { select: { contentHash: true, type: true, fileName: true } } },
      }),
    ]);
    assertNoDuplicateDocuments(
      [{ hash, type: dto.type, fileName: file.originalname }],
      [...own, ...(application?.documents ?? [])],
    );
    const filePath = `${teacherId}/${randomUUID()}-${safeFileName(file.originalname)}`;

    const { error } = await this.supabaseAdmin.client.storage
      .from(BUCKET)
      .upload(filePath, file.buffer, { contentType });
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
        contentHash: hash,
      },
      include: uploaderSelect,
    });
  }

  // Consultation a l'ecran uniquement (voir common/document-view.ts).
  async getFileForView(teacherId: string, documentId: string) {
    const document = await this.findOwned(teacherId, documentId);
    return loadDocumentForView(
      this.supabaseAdmin.client,
      BUCKET,
      document.filePath,
      document.fileName,
    );
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
