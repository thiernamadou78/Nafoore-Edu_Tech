import { LogOut } from 'lucide-react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import logoSrc from './Logo.png'

const NAV_LINKS = [
  { to: '/', label: 'Mes élèves' },
  { to: '/planning', label: 'Planning' },
]

export function TeacherLayout() {
  const { teacherAccount, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-navy text-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={logoSrc} alt="Nafoore" className="h-8 w-8 object-contain" />
            <span className="font-serif text-base font-bold">Espace Enseignant</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-white/70 sm:inline">
              {teacherAccount?.fullName}
            </span>
            <button
              onClick={signOut}
              title="Déconnexion"
              className="rounded-lg p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-4xl gap-1 px-6">
          {NAV_LINKS.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-gold-400 text-white'
                    : 'border-transparent text-white/60 hover:text-white'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </header>
      <div className="h-[3px] bg-gradient-to-r from-gold-500 via-gold-400 to-gold-500" />
      <main className="mx-auto max-w-4xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  )
}
