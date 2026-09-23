import { BadRequestException } from '@nestjs/common';

// Le type MIME envoye par le navigateur est declaratif et falsifiable : on
// identifie le fichier par ses premiers octets ("magic bytes").
const SIGNATURES: Array<{ mime: string; bytes: number[] }> = [
  { mime: 'application/pdf', bytes: [0x25, 0x50, 0x44, 0x46, 0x2d] }, // %PDF-
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
];

export const DOCUMENT_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
export const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png'];
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export function detectMimeType(buffer: Buffer | undefined): string | null {
  if (!buffer) return null;
  const match = SIGNATURES.find(
    ({ bytes }) => buffer.length >= bytes.length && bytes.every((b, i) => buffer[i] === b),
  );
  return match?.mime ?? null;
}

// Renvoie le type reel (a utiliser comme contentType de stockage) ou leve une
// 400 si le contenu ne correspond a aucun format autorise.
export function assertFileSignature(
  file: Express.Multer.File | undefined,
  allowed: string[],
  formatsLabel: string,
): string {
  if (!file?.buffer?.length) {
    throw new BadRequestException('Fichier manquant ou vide');
  }
  if (file.size > MAX_UPLOAD_BYTES || file.buffer.length > MAX_UPLOAD_BYTES) {
    throw new BadRequestException('Fichier trop volumineux (5 Mo maximum)');
  }
  const detected = detectMimeType(file.buffer);
  if (!detected || !allowed.includes(detected)) {
    throw new BadRequestException(
      `Le fichier « ${file.originalname} » n'est pas un ${formatsLabel} valide`,
    );
  }
  return detected;
}

// Nom de fichier utilisateur reutilise dans les chemins de stockage : on ne
// garde que des caracteres surs (pas de "/", "..", caracteres de controle).
export function safeFileName(name: string | undefined): string {
  const base = (name ?? 'fichier').split(/[\\/]/).pop() ?? 'fichier';
  const cleaned = base
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.{2,}/g, '.')
    .replace(/^[._]+/, '')
    .slice(0, 100);
  return cleaned || 'fichier';
}
