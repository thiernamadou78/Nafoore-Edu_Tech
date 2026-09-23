import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseAdminService } from '../auth/supabase-admin.service';

const BUCKET = 'teacher-application-documents';
const DOWNLOAD_URL_TTL_SECONDS = 60 * 5;

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

  async getDownloadUrl(applicationId: string, documentId: string) {
    const document = await this.findOwned(applicationId, documentId);

    const { data, error } = await this.supabaseAdmin.client.storage
      .from(BUCKET)
      .createSignedUrl(document.filePath, DOWNLOAD_URL_TTL_SECONDS);
    if (error || !data) {
      throw error ?? new Error('Échec de génération du lien de téléchargement');
    }

    return { url: data.signedUrl };
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
