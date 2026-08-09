const PORTAL_URL_ENV: Record<string, string> = {
  famille: 'FAMILLE_URL',
  mairie: 'MAIRIE_PORTAL_URL',
  entreprise: 'ENTREPRISE_PORTAL_URL',
  centre_formation_ecole_pro: 'ECOLE_PORTAL_URL',
  teacher: 'ENSEIGNANT_URL',
};

export function resolvePortalUrl(role: string): string {
  const envKey = PORTAL_URL_ENV[role];
  return (envKey && process.env[envKey]) || 'https://nafoore.fr';
}
