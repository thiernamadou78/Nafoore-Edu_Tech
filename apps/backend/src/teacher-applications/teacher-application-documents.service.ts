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

  async getDownloadUrl(applicationId: string, documentId: string) {
    const document = await this.prisma.teacherApplicationDocument.findFirst({
      where: { id: documentId, teacherApplicationId: applicationId },
    });
    if (!document) {
      throw new NotFoundException('Document introuvable');
    }

    const { data, error } = await this.supabaseAdmin.client.storage
      .from(BUCKET)
      .createSignedUrl(document.filePath, DOWNLOAD_URL_TTL_SECONDS);
    if (error || !data) {
      throw error ?? new Error('Échec de génération du lien de téléchargement');
    }

    return { url: data.signedUrl };
  }
}
