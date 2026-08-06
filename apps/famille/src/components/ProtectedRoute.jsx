import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function ProtectedRoute() {
  const { session, portalAccount, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Chargement…</div>
  }

  if (!session || !portalAccount) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  if (portalAccount.mustChangePassword && location.pathname !== '/changer-mot-de-passe') {
    return <Navigate to="/changer-mot-de-passe" replace />
  }

  return <Outlet />
}
