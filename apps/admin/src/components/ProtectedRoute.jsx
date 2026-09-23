import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { NAV_ITEMS } from '../config/navigation'

// Premiere rubrique du menu a laquelle le compte a acces (page d'arrivee
// quand il n'a pas acces au tableau de bord).
export function firstAllowedPath(can, isSuperAdmin) {
  const item = NAV_ITEMS.find((entry) =>
    entry.superAdminOnly ? isSuperAdmin : can(entry.module),
  )
  return item?.path ?? null
}

export function ProtectedRoute({ module, superAdminOnly }) {
  const { session, adminAccount, loading, can, isSuperAdmin } = useAuth()
  const location = useLocation()

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Chargement…</div>
  }

  if (!session || !adminAccount) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  const allowed = superAdminOnly ? isSuperAdmin : module ? can(module) : true
  if (!allowed) {
    const fallback = firstAllowedPath(can, isSuperAdmin)
    if (fallback && fallback !== location.pathname) {
      return <Navigate to={fallback} replace />
    }
    return (
      <div className="p-8 text-center text-sm text-gray-500">
        Aucune rubrique ne vous est encore attribuée. Contactez un Super Admin.
      </div>
    )
  }

  return <Outlet />
}
