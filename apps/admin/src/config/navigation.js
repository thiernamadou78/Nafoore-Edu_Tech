import { Contact2, GraduationCap, Inbox, LayoutDashboard, ShieldCheck, Users } from 'lucide-react'

export const NAV_ITEMS = [
  { label: 'Tableau de bord', path: '/', roles: ['super_admin', 'admin'], icon: LayoutDashboard },
  { label: 'Leads', path: '/leads', roles: ['super_admin', 'admin'], icon: Inbox },
  { label: 'Élèves', path: '/eleves', roles: ['super_admin', 'admin'], icon: Users },
  { label: 'Enseignants', path: '/enseignants', roles: ['super_admin', 'admin'], icon: Contact2 },
  {
    label: 'Candidatures',
    path: '/recrutement',
    roles: ['super_admin', 'admin', 'recruiter'],
    icon: GraduationCap,
  },
  { label: 'Comptes admin', path: '/comptes', roles: ['super_admin'], icon: ShieldCheck },
]
