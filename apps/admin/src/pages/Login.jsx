import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { KeyRound, Mail } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import logoSrc from '../components/IMG/Logo.png'

const useMocks = import.meta.env.VITE_USE_MOCKS === 'true'

export function Login() {
  const { session, adminAccount, signIn, error } = useAuth()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (session && adminAccount) {
    return <Navigate to={location.state?.from ?? '/'} replace />
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    try {
      await signIn(email, password)
    } catch {
      // l'erreur est déjà exposée via le contexte auth
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-sm p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <img src={logoSrc} alt="Nafoore" className="mb-3 h-14 w-14 object-contain drop-shadow-md" />
          <h1 className="text-lg font-semibold text-gray-900">Espace Admin Nafoore</h1>
          <p className="text-sm text-gray-500">Connecte-toi avec ton compte administrateur</p>
        </div>

        {useMocks && (
          <div className="mb-4 rounded-lg border border-gold-400/40 bg-gold-400/10 p-3 text-xs text-navy">
            <p className="font-semibold">Mode démo (données factices)</p>
            <p>Mot de passe : password</p>
            <ul className="mt-1 list-inside list-disc space-y-0.5">
              <li>superadmin@nafoore.test — Super Admin</li>
              <li>admin@nafoore.test — Admin</li>
              <li>recruteur@nafoore.test — Recruteur</li>
            </ul>
          </div>
        )}

        {error && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
            <div className="relative">
              <Mail
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Mot de passe</label>
            <div className="relative">
              <KeyRound
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
              />
            </div>
          </div>
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? 'Connexion…' : 'Se connecter'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
