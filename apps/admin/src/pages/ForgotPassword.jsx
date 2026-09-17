import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail } from 'lucide-react'
import { authClient } from '../lib/authAdapter'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import logoSrc from '../components/IMG/Logo.png'

export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await authClient.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reinitialiser-mot-de-passe`,
      })
      setSent(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-sm p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <img src={logoSrc} alt="Nafoore Education" className="mb-3 h-14 w-14 object-contain drop-shadow-md" />
          <h1 className="text-lg font-semibold text-gray-900">Mot de passe oublié</h1>
          <p className="text-sm text-gray-500">
            Indique ton email, on t'envoie un lien pour choisir un nouveau mot de passe.
          </p>
        </div>

        {sent ? (
          <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
            Si cet email correspond à un compte, un lien de réinitialisation vient d'être envoyé.
            Vérifie ta boîte mail.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}
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
            <Button type="submit" loading={submitting} className="w-full">
              {submitting ? 'Envoi…' : 'Recevoir le lien'}
            </Button>
          </form>
        )}

        <Link to="/login" className="mt-4 block text-center text-sm text-navy hover:underline">
          Retour à la connexion
        </Link>
      </Card>
    </div>
  )
}
