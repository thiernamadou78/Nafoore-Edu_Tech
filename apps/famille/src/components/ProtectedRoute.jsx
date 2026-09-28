import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Spinner } from './ui/Spinner'
import { TermsAcceptance } from './TermsAcceptance'

export function ProtectedRoute() {
  const { session, portalAccount, loading, refreshAccount } = useAuth()
  const location = useLocation()

  if (loading) {
    return <Spinner />
  }

  if (!session || !portalAccount) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  if (portalAccount.mustChangePassword && location.pathname !== '/changer-mot-de-passe') {
    return <Navigate to="/changer-mot-de-passe" replace />
  }

  if (
    !portalAccount.mustChangePassword &&
    !portalAccount.familyName &&
    location.pathname !== '/bienvenue'
  ) {
    return <Navigate to="/bienvenue" replace />
  }

  // CGU a accepter (premiere connexion, apres le choix du nom de famille,
  // ou nouvelle version).
  if (
    !portalAccount.mustChangePassword &&
    portalAccount.familyName &&
    portalAccount.currentTermsVersion &&
    portalAccount.termsVersion !== portalAccount.currentTermsVersion
  ) {
    return <TermsAcceptance account={portalAccount} onAccepted={refreshAccount} />
  }

  return <Outlet />
}
