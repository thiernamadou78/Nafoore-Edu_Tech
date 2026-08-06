import { LogOut } from 'lucide-react'
import { Link, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import logoSrc from './Logo.png'

export function FamilyLayout() {
  const { portalAccount, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-navy text-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={logoSrc} alt="Nafoore" className="h-8 w-8 object-contain" />
            <span className="font-serif text-base font-bold">Espace Famille</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-white/70 sm:inline">
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
      </header>
      <main className="mx-auto max-w-4xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  )
}
