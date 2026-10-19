// Elements exiges avant validation d'une candidature (inscription en deux
// temps : candidature rapide, puis dossier complete). Liste commune a
// l'admin (bouton "Documents requis") et a la page de completion.
export function missingApplicationItems(application: {
  bio: string | null;
  documents: { type: string }[];
}): string[] {
  const has = (type: string) => application.documents.some((doc) => doc.type === type);
  const missing: string[] = [];
  if (!application.bio || application.bio.trim().length < 20) {
    missing.push('Présentation (20 caractères minimum)');
  }
  if (!has('cv')) missing.push('CV');
  if (!has('piece_identite')) missing.push("Pièce d'identité");
  if (!has('diplome')) missing.push('Diplôme');
  if (!has('casier_judiciaire')) missing.push('Casier judiciaire (bulletin n°3)');
  return missing;
}
