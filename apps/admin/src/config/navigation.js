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
  ShieldCheck,
  UserPlus,
  Users, RefreshCw } from 'lucide-react'

// module : droit requis pour voir l'entree (voir config/permissions.js).
export const NAV_ITEMS = [
  { label: 'Tableau de bord', path: '/', module: 'dashboard', icon: LayoutDashboard },
  { label: 'Leads', path: '/leads', module: 'leads', icon: Inbox },
  { label: 'Élèves', path: '/eleves', module: 'students', icon: Users },
  { label: 'Enseignants', path: '/enseignants', module: 'teachers', icon: Contact2 },
  {
    label: 'Demandes de professeur',
    path: '/demandes-professeur',
    module: 'teacher_requests',
    icon: UserPlus,
  },
  { label: 'Renouvellements', path: '/renouvellements', module: 'renewals', icon: RefreshCw },
  {
    label: 'Candidatures',
    path: '/recrutement',
    module: 'recruitment',
    icon: GraduationCap,
  },
  {
    label: 'Conversations',
    path: '/conversations',
    module: 'messaging',
    icon: MessageSquare,
  },
  {
    label: 'Suivi des pointages',
    path: '/pointages',
    module: 'attendance',
    icon: RadioTower,
  },
  {
    label: 'Support',
    path: '/support-tickets',
    module: 'support',
    icon: LifeBuoy,
  },
  {
    label: 'Entreprises',
    path: '/entreprises',
    module: 'enterprises',
    icon: Building2,
  },
  {
    label: 'Formules',
    path: '/formules',
    module: 'formulas',
    icon: LayoutList,
  },
  {
    label: 'Site vitrine',
    path: '/site-vitrine',
    module: 'site',
    icon: Globe,
  },
  { label: 'Matières', path: '/matieres', superAdminOnly: true, icon: BookOpen },
  { label: 'Comptes admin', path: '/comptes', superAdminOnly: true, icon: ShieldCheck },
]
