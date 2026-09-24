import { useState } from 'react'
import { ChevronDown, Eye, LogOut } from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { NAV_GROUPS, NAV_ITEMS } from '../config/navigation'
import { ROLE_LABELS } from '../config/roles'
import { initials } from '../lib/initials'
import { NotificationBell } from './NotificationBell'
import logoSrc from './IMG/Logo.png'

// Au-dela de ce nombre d'entrees, le menu est range en sections repliables ;
// en dessous (delegue avec peu de droits), une liste simple suffit.
const GROUPED_MENU_MIN_ITEMS = 7
const COLLAPSED_STORAGE_KEY = 'nafoore-admin-menu-collapsed'

function readCollapsed() {
  try {
    return JSON.parse(localStorage.getItem(COLLAPSED_STORAGE_KEY) ?? '[]')
  } catch {
    return []
  }
}

function NavItem({ item }) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.path}
      end={item.path === '/'}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg border-l-2 px-3 py-1.5 text-sm transition-colors ${
          isActive
            ? 'border-gold-400 bg-white/10 font-medium text-white'
            : 'border-transparent text-white/70 hover:bg-white/5 hover:text-white'
        }`
      }
    >
      <Icon size={17} strokeWidth={2} />
      {item.label}
    </NavLink>
  )
}

export function AdminLayout() {
  const { adminAccount, signOut, can, isSuperAdmin } = useAuth()
  const location = useLocation()
  const visibleItems = NAV_ITEMS.filter((item) =>
    item.superAdminOnly ? isSuperAdmin : can(item.module),
  )
  const primaryRole = adminAccount?.role
  // Rubrique courante en consultation seule : on le signale en haut de page
  // (les boutons restent visibles mais l'API refusera les modifications).
  const currentItem = [...NAV_ITEMS]
    .sort((a, b) => b.path.length - a.path.length)
    .find((item) =>
      item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path),
    )
  const readOnly = currentItem?.module && can(currentItem.module) && !can(currentItem.module, 'edit')

  const [collapsed, setCollapsed] = useState(readCollapsed)
  const toggleGroup = (key) => {
    setCollapsed((current) => {
      const next = current.includes(key) ? current.filter((k) => k !== key) : [...current, key]
      try {
        localStorage.setItem(COLLAPSED_STORAGE_KEY, JSON.stringify(next))
      } catch {
        // stockage indisponible : l'etat reste valable pour la session
      }
      return next
    })
  }
  const grouped = visibleItems.length >= GROUPED_MENU_MIN_ITEMS
  const topItems = grouped ? visibleItems.filter((item) => !item.group) : visibleItems
  const sections = grouped
    ? NAV_GROUPS.map((group) => ({
        ...group,
        items: visibleItems.filter((item) => item.group === group.key),
      })).filter((group) => group.items.length > 0)
    : []

  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col bg-navy text-white">
        <div className="flex items-center gap-2.5 p-5">
          <img src={logoSrc} alt="Nafoore Education" className="h-9 w-9 object-contain drop-shadow-md" />
          <span className="font-sans text-base font-semibold">Nafoore Education Admin</span>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-3">
          {topItems.map((item) => (
            <NavItem key={item.path} item={item} />
          ))}
          {sections.map((section) => {
            // La section de la page ouverte reste toujours depliee.
            const containsActive = section.items.some((item) => item.path === currentItem?.path)
            const open = containsActive || !collapsed.includes(section.key)
            return (
              <div key={section.key} className="pt-3">
                <button
                  type="button"
                  onClick={() => toggleGroup(section.key)}
                  disabled={containsActive}
                  className="flex w-full items-center justify-between px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-white/40 transition-colors hover:text-white/70 disabled:cursor-default disabled:hover:text-white/40"
                >
                  {section.label}
                  {!containsActive && (
                    <ChevronDown
                      size={13}
                      className={`transition-transform ${open ? '' : '-rotate-90'}`}
                    />
                  )}
                </button>
                {open && (
                  <div className="space-y-0.5">
                    {section.items.map((item) => (
                      <NavItem key={item.path} item={item} />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </nav>
        <div className="flex items-center gap-3 border-t border-white/10 p-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold">
            {initials(adminAccount?.name)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{adminAccount?.name}</div>
            <div className="truncate text-xs text-white/60">
              {ROLE_LABELS[primaryRole] ?? primaryRole}
            </div>
          </div>
          <button
            onClick={signOut}
            title="Déconnexion"
            className="rounded-lg p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>
      <main className="flex-1">
        <header className="flex items-center justify-end border-b border-gray-200 bg-white px-8 py-3">
          <NotificationBell />
        </header>
        <div className="p-8">
          {readOnly && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <Eye size={16} className="shrink-0" />
              Consultation seule : vous pouvez voir cette rubrique mais pas la modifier.
            </div>
          )}
          <Outlet />
        </div>
      </main>
    </div>
  )
}
