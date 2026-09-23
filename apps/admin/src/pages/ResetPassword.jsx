import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { authClient } from '../lib/authAdapter'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { PasswordInput } from '../components/ui/PasswordInput'
import logoSrc from '../components/IMG/Logo.png'

export function ResetPassword() {
  const { session, loading } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  // Lien recu par email (invitation ou mot de passe oublie) : on valide le
  // jeton pour ouvrir la session, puis on retire le jeton de l'adresse.
  const [verifying, setVerifying] = useState(() =>
    new URLSearchParams(window.location.search).has('token_hash'),
  )
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const tokenHash = params.get('token_hash')
    if (!tokenHash) return
    const type = params.get('type') === 'invite' ? 'invite' : 'recovery'
    authClient.auth
      .verifyOtp({ token_hash: tokenHash, type })
      .catch(() => {})
      .finally(() => {
        window.history.replaceState(null, '', window.location.pathname)
        setVerifying(false)
      })
  }, [])

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
      const { error: updateError } = await authClient.auth.updateUser({ password })
      if (updateError) throw updateError
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading || verifying) {
    return <p className="text-gray-500">Chargement…</p>
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-sm p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <img src={logoSrc} alt="Nafoore Education" className="mb-3 h-14 w-14 object-contain drop-shadow-md" />
          <h1 className="text-lg font-semibold text-gray-900">Nouveau mot de passe</h1>
          <p className="text-sm text-gray-500">Choisis un nouveau mot de passe pour ton compte.</p>
        </div>

        {!session ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            Ce lien de réinitialisation est invalide ou a expiré. Refais une demande depuis la page
            de connexion.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Nouveau mot de passe
              </label>
              <PasswordInput
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Confirmer le mot de passe
              </label>
              <PasswordInput
                required
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
            <Button type="submit" loading={submitting} className="w-full">
              {submitting ? 'Enregistrement…' : 'Valider'}
            </Button>
          </form>
        )}
      </Card>
    </div>
  )
}
