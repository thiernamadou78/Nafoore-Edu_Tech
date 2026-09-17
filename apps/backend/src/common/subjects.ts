// Liste canonique des matières (union du programme primaire/collège/lycée
// défini côté famille dans apps/famille/src/pages/curriculum.js). Utilisée
// pour valider Teacher.subjects, TeacherApplication.subjects et
// TeacherRequest.subject afin qu'ils partagent le même vocabulaire — sans
// ça, faire correspondre une demande famille aux matières d'un prof serait
// impossible (comparaison de texte libre non fiable).
export const SUBJECT_OPTIONS = [
  'Français',
  'Mathématiques',
  'Questionner le monde',
  'Histoire-Géographie',
  'Anglais',
  'Arts plastiques',
  'Éducation musicale',
  'EPS',
  'Éducation morale et civique',
  'Sciences de la Vie et de la Terre (SVT)',
  'Physique-Chimie',
  'Technologie',
  'Espagnol',
  'Allemand',
  'Latin',
  'Philosophie',
  'Enseignement scientifique',
  'SES',
  'Numérique et Sciences Informatiques (NSI)',
  'Histoire-Géo, Géopolitique et Sciences Politiques',
  'Humanités, Littérature et Philosophie',
  'Langues, Littératures et Cultures Étrangères',
  "Sciences de l'Ingénieur",
  'Arts',
] as const;

export type Subject = (typeof SUBJECT_OPTIONS)[number];
