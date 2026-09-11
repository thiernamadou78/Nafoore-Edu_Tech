import { useCallback, useEffect, useRef, useState } from 'react'
import {
  CalendarClock,
  Euro,
  Home,
  LifeBuoy,
  LogOut,
  MessageSquare,
  MoreHorizontal,
  ScanLine,
  Star,
  Users,
} from 'lucide-react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { isPushSupported, subscribeToPush } from '../lib/pushNotifications'
import logoSrc from './Logo.png'

const PUSH_BANNER_DISMISSED_KEY = 'nafoore-enseignant-push-dismissed'

const NAV_LINKS = [
  { to: '/', label: 'Tableau de bord', icon: Home },
  { to: '/eleves', label: 'Mes élèves', icon: Users },
  { to: '/planning', label: 'Planning', icon: CalendarClock },
  { to: '/pointage', label: 'Pointage', icon: ScanLine },
  { to: '/remuneration', label: 'Rémunération', icon: Euro },
  { to: '/messagerie', label: 'Messagerie', icon: MessageSquare },
  { to: '/avis', label: 'Avis', icon: Star },
  { to: '/support', label: 'Support', icon: LifeBuoy },
]

// Les 3 destinations les plus utilisées sur téléphone (entre deux séances),
// affichées directement dans la barre du bas. Le reste va dans "Plus".
const MOBILE_PRIMARY = ['/', '/planning', '/pointage']

export function TeacherLayout() {
  const { teacherAccount, signOut } = useAuth()
  const location = useLocation()
  const [unreadCount, setUnreadCount] = useState(0)
  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef(null)
  const [showPushBanner, setShowPushBanner] = useState(false)
  const [pushLoading, setPushLoading] = useState(false)
  const [pushError, setPushError] = useState(null)

  useEffect(() => {
    if (!isPushSupported()) return
    const dismissed = localStorage.getItem(PUSH_BANNER_DISMISSED_KEY) === '1'
    if (!dismissed && Notification.permission === 'default') {
      setShowPushBanner(true)
    }
  }, [])

  const handleEnablePush = () => {
    setPushLoading(true)
    setPushError(null)
    subscribeToPush(api)
      .then(() => setShowPushBanner(false))
      .catch((err) => setPushError(err.message))
      .finally(() => setPushLoading(false))
  }

  const dismissPushBanner = () => {
    localStorage.setItem(PUSH_BANNER_DISMISSED_KEY, '1')
    setShowPushBanner(false)
  }

  const refreshUnreadCount = useCallback(() => {
    return api
      .get('/teacher/messages/unread-count')
      .then(({ count }) => setUnreadCount(count))
      .catch(() => {})
  }, [])

  useEffect(() => {
    refreshUnreadCount()
    setMoreOpen(false)
  }, [location.pathname, refreshUnreadCount])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (moreRef.current && !moreRef.current.contains(event.target)) {
        setMoreOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const primaryLinks = NAV_LINKS.filter((link) => MOBILE_PRIMARY.includes(link.to))
  const moreLinks = NAV_LINKS.filter((link) => !MOBILE_PRIMARY.includes(link.to))
  const isMoreActive = moreLinks.some((link) => link.to === location.pathname)

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-navy text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={logoSrc} alt="Nafoore Education" className="h-8 w-8 object-contain" />
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
        {/* Onglets complets — desktop/tablette uniquement, la barre du bas prend le relais sur mobile */}
        <nav className="mx-auto hidden max-w-5xl flex-wrap gap-1 px-6 sm:flex">
          {NAV_LINKS.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `relative flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
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

      {showPushBanner && (
        <div className="border-b border-gold-400/30 bg-gold-400/10 px-6 py-2.5">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-navy">
              Active les notifications pour être rappelé de scanner en début et fin de séance.
            </span>
            <div className="flex items-center gap-3">
              {pushError && <span className="text-xs text-red-600">{pushError}</span>}
              <button
                type="button"
                onClick={handleEnablePush}
                disabled={pushLoading}
                className="rounded-full bg-navy px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pushLoading ? 'Activation…' : 'Activer les notifications'}
              </button>
              <button
                type="button"
                onClick={dismissPushBanner}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Plus tard
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-5xl px-6 py-8 pb-24 sm:pb-8">
        <Outlet context={{ refreshUnreadCount }} />
      </main>

      {/* Barre d'onglets basse — mobile uniquement, façon appli native */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-gray-200 bg-white shadow-[0_-2px_8px_rgba(0,0,0,0.06)] sm:hidden">
        {primaryLinks.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${
                isActive ? 'text-navy' : 'text-gray-400'
              }`
            }
          >
            <Icon size={20} strokeWidth={2} />
            {label === 'Tableau de bord' ? 'Accueil' : label}
          </NavLink>
        ))}
        <div ref={moreRef} className="relative flex flex-1">
          <button
            onClick={() => setMoreOpen((v) => !v)}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${
              isMoreActive || moreOpen ? 'text-navy' : 'text-gray-400'
            }`}
          >
            <span className="relative">
              <MoreHorizontal size={20} strokeWidth={2} />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-gold-500" />
              )}
            </span>
            Plus
          </button>
          {moreOpen && (
            <div className="absolute bottom-full right-0 mb-2 w-52 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
              {moreLinks.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center justify-between gap-2 px-4 py-2.5 text-sm ${
                      isActive ? 'bg-gold-400/10 font-medium text-navy' : 'text-gray-700'
                    }`
                  }
                >
                  <span className="flex items-center gap-2">
                    <Icon size={16} />
                    {label}
                  </span>
                  {to === '/messagerie' && unreadCount > 0 && (
                    <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-gold-400 px-1 text-[10px] font-bold text-navy">
                      {unreadCount}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          )}
        </div>
      </nav>
    </div>
  )
}
