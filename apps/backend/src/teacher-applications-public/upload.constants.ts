import { BadRequestException } from '@nestjs/common';

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 Mo

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

export function documentFileFilter(
  _req: unknown,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
) {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    callback(null, true);
  } else {
    callback(
      new BadRequestException('Format de fichier non supporté (PDF, JPG ou PNG uniquement)'),
      false,
    );
  }
}
