import { useCallback, useEffect, useState } from 'react'
import { LogOut, UserPlus } from 'lucide-react'
import { Link, NavLink, Outlet, useLocation, useMatch, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { StudentsProvider, useStudents } from '../context/StudentsContext'
import { api } from '../lib/api'
import logoSrc from './Logo.png'

const NAV_LINKS = [
  { to: '/', label: 'Mes enfants' },
  { to: '/messagerie', label: 'Messagerie' },
]

function StudentSwitcher() {
  const { students } = useStudents()
  const navigate = useNavigate()
  const match = useMatch('/eleves/:id')

  if (!students || students.length < 2) return null

  return (
    <select
      value={match?.params.id ?? ''}
      onChange={(e) => navigate(`/eleves/${e.target.value}`)}
      className="rounded-lg border border-white/20 bg-white/10 px-2.5 py-1.5 text-sm text-white focus:border-white/40 focus:outline-none"
    >
      <option value="" disabled>
        Choisir un enfant
      </option>
      {students.map((student) => (
        <option key={student.id} value={student.id} className="text-gray-900">
          {student.name}
        </option>
      ))}
    </select>
  )
}

export function FamilyLayout() {
  const { portalAccount, signOut } = useAuth()
  const location = useLocation()
  const [unreadCount, setUnreadCount] = useState(0)

  const refreshUnreadCount = useCallback(() => {
    return api
      .get('/family/messages/unread-count')
      .then(({ count }) => setUnreadCount(count))
      .catch(() => {})
  }, [])

  useEffect(() => {
    refreshUnreadCount()
  }, [location.pathname, refreshUnreadCount])

  return (
    <StudentsProvider>
      <div className="min-h-screen bg-cream">
        <header className="bg-navy text-white">
          <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
            <Link to="/" className="flex items-center gap-2.5">
              <img src={logoSrc} alt="Nafoore" className="h-8 w-8 object-contain" />
              <div className="leading-tight">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-gold-400">
                  Espace Famille
                </div>
                <div className="font-serif text-base font-bold">
                  {portalAccount?.familyName || 'Nafoore'}
                </div>
              </div>
            </Link>
            <div className="flex items-center gap-3">
              <StudentSwitcher />
              <Link
                to="/eleves/nouveau"
                title="Ajouter un enfant"
                className="flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-2.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-white/20"
              >
                <UserPlus size={15} />
                <span className="hidden sm:inline">Ajouter un enfant</span>
              </Link>
              <span className="hidden text-sm text-white/70 md:inline">
                {portalAccount?.fullName}
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
                  `flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'border-gold-400 text-white'
                      : 'border-transparent text-white/60 hover:text-white'
                  }`
                }
              >
                {label}
                {to === '/messagerie' && unreadCount > 0 && (
                  <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-gold-400 px-1 text-[10px] font-bold text-navy">
                    {unreadCount}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
        </header>
        <div className="h-[3px] bg-gradient-to-r from-gold-500 via-gold-400 to-gold-500" />
        <main className="mx-auto max-w-4xl px-6 py-8">
          <Outlet context={{ refreshUnreadCount }} />
        </main>
      </div>
    </StudentsProvider>
  )
}
