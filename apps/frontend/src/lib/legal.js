// Informations legales de la societe, reprises par les pages Mentions
// legales, CGU et Politique de confidentialite. Une seule source a mettre a
// jour (changement d'adresse, de capital, de directeur de publication…).
export const COMPANY = {
  name: 'Nafoore Education',
  legalForm: 'Société par actions simplifiée à associé unique (SASU)',
  capital: '100 €',
  siren: '109 195 974',
  rcs: 'RCS Créteil',
  address: '05 rue Berry, 94550 Chevilly-Larue, France',
  email: 'direction@nafoore.com',
  contactEmail: 'contact@nafoore.com',
  phone: '07 67 65 99 77',
  // Directeur de la publication : le representant legal (President).
  publicationDirector: 'Le Président de Nafoore Education',
  website: 'education.nafoore.com',
}

// Version en vigueur des CGU : doit correspondre a TERMS_VERSION cote
// backend (apps/backend/src/common/legal.ts). La changer impose une nouvelle
// acceptation a tous les comptes famille et enseignant.
export const TERMS_VERSION = '2026-09-28'
export const TERMS_UPDATED_AT = '28 septembre 2026'

// Charte de confidentialite des enseignants : doit correspondre a
// CHARTER_VERSION cote backend (acceptation redemandee si elle change).
export const CHARTER_VERSION = '2026-09-28'
export const CHARTER_UPDATED_AT = '28 septembre 2026'

export const HOSTS = [
  {
    role: 'Sites et applications web',
    name: 'Vercel Inc.',
    address: '440 N Barranca Ave #4133, Covina, CA 91723, États-Unis',
    url: 'https://vercel.com',
  },
  {
    role: 'Serveur applicatif (API)',
    name: 'Render Services, Inc.',
    address: '525 Brannan Street, Suite 300, San Francisco, CA 94107, États-Unis',
    url: 'https://render.com',
  },
  {
    role: 'Base de données et fichiers (serveurs situés dans l’Union européenne)',
    name: 'Supabase, Inc.',
    address: '970 Toa Payoh North #07-04, Singapour 318992',
    url: 'https://supabase.com',
  },
]
