// Version en vigueur des CGU (date de publication). Doit correspondre a
// TERMS_VERSION de la vitrine (apps/frontend/src/lib/legal.js). La changer
// redemande l'acceptation a tous les comptes famille et enseignant a leur
// prochaine connexion.
export const TERMS_VERSION = '2026-09-28';

// Version en vigueur de la charte de confidentialite des enseignants (meme
// principe, comptes enseignant uniquement). Correspond a CHARTER_VERSION de
// la vitrine.
export const CHARTER_VERSION = '2026-09-28';

// Statut d'acceptation d'un document : a jour, ancienne version acceptee,
// ou jamais accepte.
export function acceptanceStatus(accepted: string | null, current: string) {
  if (!accepted) return 'pending' as const;
  return accepted === current ? ('accepted' as const) : ('outdated' as const);
}
