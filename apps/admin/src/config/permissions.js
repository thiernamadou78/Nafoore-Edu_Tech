// Modules sur lesquels le Super Admin accorde des droits (doit rester aligne
// avec ADMIN_MODULES dans apps/backend/src/auth/permissions.ts).
export const ADMIN_MODULES = [
  { key: 'dashboard', label: 'Tableau de bord', hint: 'Chiffres clés et carte' },
  { key: 'leads', label: 'Leads', hint: 'Demandes des familles, création de familles' },
  { key: 'students', label: 'Élèves', hint: 'Fiches élèves, séances, documents, suivi' },
  { key: 'teachers', label: 'Enseignants', hint: 'Fiches enseignants, documents' },
  { key: 'recruitment', label: 'Candidatures', hint: 'Recrutement des enseignants' },
  { key: 'teacher_requests', label: 'Demandes de professeur', hint: 'Attribution des enseignants' },
  { key: 'renewals', label: 'Renouvellements', hint: 'Prolongation des accompagnements' },
  { key: 'messaging', label: 'Conversations', hint: 'Modération des messages' },
  { key: 'support', label: 'Support', hint: 'Tickets des familles et enseignants' },
  { key: 'attendance', label: 'Suivi des pointages', hint: 'Alertes de présence' },
  { key: 'enterprises', label: 'Entreprises', hint: 'Entreprises, contrats, comptes RH' },
  { key: 'formulas', label: 'Formules', hint: 'Offres et tarifs' },
  { key: 'site', label: 'Site vitrine', hint: 'Témoignages et réglages du site' },
]

export const MODULE_LABELS = Object.fromEntries(ADMIN_MODULES.map((m) => [m.key, m.label]))
