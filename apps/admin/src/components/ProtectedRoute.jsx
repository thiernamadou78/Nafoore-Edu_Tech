import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function ProtectedRoute({ roles }) {
  const { session, adminAccount, loading, hasRole } = useAuth()
  const location = useLocation()

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Chargement…</div>
  }

  if (!session || !adminAccount) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  if (roles && !hasRole(...roles)) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
