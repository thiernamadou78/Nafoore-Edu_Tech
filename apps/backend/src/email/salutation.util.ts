// "Monsieur Jean Dupont" / "Madame Awa Diallo" quand le genre est connu,
// sinon le nom seul (comptes anciens ou genre non renseigne).
export function salutation(fullName: string, gender?: string | null): string {
  if (gender === 'homme') return `Monsieur ${fullName}`;
  if (gender === 'femme') return `Madame ${fullName}`;
  return fullName;
}
