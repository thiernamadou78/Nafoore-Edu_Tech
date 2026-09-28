import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Spinner } from './ui/Spinner'
import { TermsAcceptance } from './TermsAcceptance'

export function ProtectedRoute() {
  const { session, teacherAccount, loading, refreshAccount } = useAuth()
  const location = useLocation()

  if (loading) {
    return <Spinner />
  }

  if (!session || !teacherAccount) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  if (teacherAccount.mustChangePassword && location.pathname !== '/changer-mot-de-passe') {
    return <Navigate to="/changer-mot-de-passe" replace />
  }

  // CGU a accepter (premiere connexion ou nouvelle version).
  if (
    !teacherAccount.mustChangePassword &&
    teacherAccount.currentTermsVersion &&
    teacherAccount.termsVersion !== teacherAccount.currentTermsVersion
  ) {
    return <TermsAcceptance account={teacherAccount} onAccepted={refreshAccount} />
  }

  return <Outlet />
}
