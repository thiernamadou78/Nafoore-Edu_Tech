import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { SupabaseAdminService } from '../auth/supabase-admin.service';

const BUCKET = 'profile-photos';
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1h — affichées en continu dans les listes

@Injectable()
export class PhotosService {
  constructor(private readonly supabaseAdmin: SupabaseAdminService) {}

  buildPath(entityType: 'students' | 'teachers', entityId: string, fileName: string) {
    return `${entityType}/${entityId}/${randomUUID()}-${fileName}`;
  }

  async upload(path: string, file: Express.Multer.File) {
    const { error } = await this.supabaseAdmin.client.storage
      .from(BUCKET)
      .upload(path, file.buffer, { contentType: file.mimetype });
    if (error) {
      throw error;
    }
  }

  async remove(path: string) {
    await this.supabaseAdmin.client.storage.from(BUCKET).remove([path]);
  }

  async signUrl(path: string | null | undefined): Promise<string | null> {
    if (!path) return null;
    const { data, error } = await this.supabaseAdmin.client.storage
      .from(BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
    if (error || !data) return null;
    return data.signedUrl;
  }

  async signUrls(paths: (string | null | undefined)[]): Promise<Map<string, string>> {
    const uniquePaths = [...new Set(paths.filter((p): p is string => Boolean(p)))];
    if (uniquePaths.length === 0) return new Map();

    const { data, error } = await this.supabaseAdmin.client.storage
      .from(BUCKET)
      .createSignedUrls(uniquePaths, SIGNED_URL_TTL_SECONDS);
    if (error || !data) return new Map();

    const map = new Map<string, string>();
    for (const entry of data) {
      if (entry.signedUrl && entry.path) {
        map.set(entry.path, entry.signedUrl);
      }
    }
    return map;
  }
}
