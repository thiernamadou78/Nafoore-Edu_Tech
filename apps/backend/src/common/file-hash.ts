import { BadRequestException } from '@nestjs/common';
import { createHash } from 'crypto';

// Empreinte du CONTENU d'un fichier (pas de son nom) : deux fichiers
// identiques ont la meme empreinte, meme renommes.
export function fileHash(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

const TYPE_LABELS: Record<string, string> = {
  cv: 'CV',
  piece_identite: "pièce d'identité",
  diplome: 'diplôme',
  casier_judiciaire: 'casier judiciaire',
  autre: 'autre document',
};
const label = (type: string) => TYPE_LABELS[type] ?? type;

export interface HashedUpload {
  hash: string;
  type: string;
  fileName: string;
}

// Un meme fichier ne peut pas etre depose deux fois dans un dossier :
// ni dans le meme envoi (ex. le meme PDF en CV et en diplome), ni s'il y
// figure deja.
export function assertNoDuplicateDocuments(
  uploads: HashedUpload[],
  existing: { contentHash: string | null; type: string; fileName: string }[],
) {
  const seen = new Map<string, HashedUpload>();
  for (const upload of uploads) {
    const twin = seen.get(upload.hash);
    if (twin) {
      throw new BadRequestException(
        `« ${upload.fileName} » (${label(upload.type)}) et « ${twin.fileName} » (${label(twin.type)}) sont le même fichier : chaque document doit être différent.`,
      );
    }
    seen.set(upload.hash, upload);
    const already = existing.find((doc) => doc.contentHash === upload.hash);
    if (already) {
      throw new BadRequestException(
        `« ${upload.fileName} » a déjà été déposé dans ce dossier (${label(already.type)} : « ${already.fileName} »). Choisissez le bon document.`,
      );
    }
  }
}
