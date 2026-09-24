import { StreamableFile } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { detectMimeType, safeFileName } from './file-signature';

// Documents sensibles (CV, piece d'identite, casier…) : l'admin peut les
// CONSULTER a l'ecran, jamais les telecharger via un lien. Le fichier est lu
// dans le stockage par l'API et renvoye directement, pour affichage :
// - pas d'URL signee partageable (l'ancien lien restait valable 5 min) ;
// - Content-Disposition "inline" + Cache-Control no-store (pas de copie en
//   cache du navigateur) ;
// - chaque consultation est tracee (voir les controleurs).
export async function loadDocumentForView(
  client: SupabaseClient,
  bucket: string,
  filePath: string,
  fileName: string,
): Promise<StreamableFile> {
  const { data, error } = await client.storage.from(bucket).download(filePath);
  if (error || !data) {
    throw error ?? new Error('Document introuvable dans le stockage');
  }
  const buffer = Buffer.from(await data.arrayBuffer());
  const type = detectMimeType(buffer) ?? 'application/octet-stream';
  return new StreamableFile(buffer, {
    type,
    disposition: `inline; filename*=UTF-8''${encodeURIComponent(safeFileName(fileName))}`,
    length: buffer.length,
  });
}
