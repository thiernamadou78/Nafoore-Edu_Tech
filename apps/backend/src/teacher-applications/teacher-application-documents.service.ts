import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseAdminService } from '../auth/supabase-admin.service';
import { loadDocumentForView } from '../common/document-view';

const BUCKET = 'teacher-application-documents';

@Injectable()
export class TeacherApplicationDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly supabaseAdmin: SupabaseAdminService,
  ) {}

  private async findOwned(applicationId: string, documentId: string) {
    const document = await this.prisma.teacherApplicationDocument.findFirst({
      where: { id: documentId, teacherApplicationId: applicationId },
    });
    if (!document) {
      throw new NotFoundException('Document introuvable');
    }
    return document;
  }

  // Consultation a l'ecran uniquement (voir common/document-view.ts).
  async getFileForView(applicationId: string, documentId: string) {
    const document = await this.findOwned(applicationId, documentId);
    return loadDocumentForView(this.supabaseAdmin.client, BUCKET, document.filePath, document.fileName);
  }

  // Suppression definitive (fichier + ligne) : laissee a l'appreciation de
  // l'admin, par ex. un casier judiciaire une fois verifie.
  async remove(applicationId: string, documentId: string) {
    const document = await this.findOwned(applicationId, documentId);
    const { error } = await this.supabaseAdmin.client.storage
      .from(BUCKET)
      .remove([document.filePath]);
    if (error) throw error;
    await this.prisma.teacherApplicationDocument.delete({ where: { id: documentId } });
  }
}
