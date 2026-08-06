import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { KeyRound } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import logoSrc from '../components/Logo.png'

export function ChangePassword() {
  const { completePasswordChange } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Le mot de passe doit faire au moins 8 caractères.')
      return
    }
    if (password !== confirm) {
      setError('Les deux mots de passe ne correspondent pas.')
      return
    }

    setSubmitting(true)
    try {
      await completePasswordChange(password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4">
      <Card className="w-full max-w-sm p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <img src={logoSrc} alt="Nafoore" className="mb-3 h-14 w-14 object-contain drop-shadow-md" />
          <h1 className="font-serif text-lg font-bold text-navy">Choisis ton mot de passe</h1>
          <p className="text-sm text-gray-500">
            Pour ta sécurité, remplace le mot de passe temporaire reçu par email.
          </p>
        </div>

        {error && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Nouveau mot de passe</label>
            <div className="relative">
              <KeyRound
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Confirmer le mot de passe</label>
            <div className="relative">
              <KeyRound
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="password"
                required
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
              />
            </div>
          </div>
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? 'Enregistrement…' : 'Valider'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
