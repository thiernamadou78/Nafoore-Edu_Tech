import {
  BookOpen,
  Building2,
  Contact2,
  Globe,
  GraduationCap,
  Inbox,
  LayoutDashboard,
  LayoutList,
  LifeBuoy,
  MessageSquare,
  RadioTower,
  RefreshCw,
  ShieldCheck,
  UserPlus,
  Users,
} from 'lucide-react'

// Sections du menu (repliables). Une entree sans groupe reste en tete.
export const NAV_GROUPS = [
  { key: 'familles', label: 'Familles & élèves' },
  { key: 'enseignants', label: 'Enseignants' },
  { key: 'suivi', label: 'Suivi' },
  { key: 'entreprises', label: 'Entreprises' },
  { key: 'administration', label: 'Administration' },
]

// module : droit requis pour voir l'entree (voir config/permissions.js).
// L'ordre compte : la premiere entree accessible sert de page d'arrivee.
export const NAV_ITEMS = [
  { label: 'Tableau de bord', path: '/', module: 'dashboard', icon: LayoutDashboard },

  { group: 'familles', label: 'Leads', path: '/leads', module: 'leads', icon: Inbox },
  { group: 'familles', label: 'Élèves', path: '/eleves', module: 'students', icon: Users },
  {
    group: 'familles',
    label: 'Demandes de professeur',
    path: '/demandes-professeur',
    module: 'teacher_requests',
    icon: UserPlus,
  },
  { group: 'familles', label: 'Renouvellements', path: '/renouvellements', module: 'renewals', icon: RefreshCw },

  { group: 'enseignants', label: 'Enseignants', path: '/enseignants', module: 'teachers', icon: Contact2 },
  { group: 'enseignants', label: 'Candidatures', path: '/recrutement', module: 'recruitment', icon: GraduationCap },

  { group: 'suivi', label: 'Conversations', path: '/conversations', module: 'messaging', icon: MessageSquare },
  { group: 'suivi', label: 'Pointages', path: '/pointages', module: 'attendance', icon: RadioTower },
  { group: 'suivi', label: 'Support', path: '/support-tickets', module: 'support', icon: LifeBuoy },

  { group: 'entreprises', label: 'Entreprises', path: '/entreprises', module: 'enterprises', icon: Building2 },
  { group: 'entreprises', label: 'Formules', path: '/formules', module: 'formulas', icon: LayoutList },

  { group: 'administration', label: 'Site vitrine', path: '/site-vitrine', module: 'site', icon: Globe },
  { group: 'administration', label: 'Matières', path: '/matieres', superAdminOnly: true, icon: BookOpen },
  { group: 'administration', label: 'Comptes admin', path: '/comptes', superAdminOnly: true, icon: ShieldCheck },
]
