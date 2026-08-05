import { LogOut } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { NAV_ITEMS } from '../config/navigation'
import { ROLE_LABELS } from '../config/roles'
import { initials } from '../lib/initials'
import logoSrc from './IMG/Logo.png'

export function AdminLayout() {
  const { adminAccount, signOut, hasRole } = useAuth()
  const visibleItems = NAV_ITEMS.filter((item) => hasRole(...item.roles))
  const primaryRole = adminAccount?.roles.includes('super_admin')
    ? 'super_admin'
    : adminAccount?.roles[0]

  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside className="w-64 shrink-0 bg-navy text-white flex flex-col">
        <div className="flex items-center gap-2.5 p-5">
          <img src={logoSrc} alt="Nafoore" className="h-9 w-9 object-contain drop-shadow-md" />
          <span className="font-sans text-base font-semibold">Nafoore Admin</span>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {visibleItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg border-l-2 px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? 'border-gold-400 bg-white/10 font-medium text-white'
                      : 'border-transparent text-white/70 hover:bg-white/5 hover:text-white'
                  }`
                }
              >
                <Icon size={18} strokeWidth={2} />
                {item.label}
              </NavLink>
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
      <main className="flex-1 p-8">
        <Outlet />
      </main>
    </div>
  )
}
