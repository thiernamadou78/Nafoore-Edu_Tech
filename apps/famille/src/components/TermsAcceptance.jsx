import { useState } from 'react'
import { FileCheck2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { Button } from './ui/Button'

const VITRINE_URL = import.meta.env.VITE_VITRINE_URL || 'https://education.nafoore.com'

// Acceptation des CGU et de la politique de confidentialite : a la premiere
// connexion, puis a chaque nouvelle version (voir common/legal.ts cote
// backend). La version acceptee et la date sont enregistrees.
export function TermsAcceptance({ account, onAccepted }) {
  const { signOut } = useAuth()
  const [checked, setChecked] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const isUpdate = Boolean(account.termsVersion)

  const accept = async () => {
    setSaving(true)
    setError(null)
    try {
      await api.patch('/family/me/accept-terms', {})
      await onAccepted()
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4 py-10">
      <div className="w-full max-w-md rounded-2xl bg-white p-7 shadow-xl">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-navy/10 text-navy">
          <FileCheck2 size={22} />
        </div>
        <h1 className="font-serif text-xl font-bold text-navy">
          {isUpdate ? 'Nos conditions évoluent' : 'Bienvenue sur Nafoore Education'}
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          {isUpdate
            ? 'Nos conditions d’utilisation ont été mises à jour. Merci d’en prendre connaissance pour continuer à utiliser votre espace.'
            : 'Avant d’accéder à votre espace famille, merci de prendre connaissance de nos conditions d’utilisation et de la façon dont nous protégeons vos données et celles de votre enfant.'}
        </p>
        <ul className="mt-4 space-y-2 text-sm">
          <li>
            <a href={`${VITRINE_URL}/cgu`} target="_blank" rel="noreferrer" className="font-semibold text-navy underline">
              Conditions générales d’utilisation
            </a>
          </li>
          <li>
            <a href={`${VITRINE_URL}/confidentialite`} target="_blank" rel="noreferrer" className="font-semibold text-navy underline">
              Politique de confidentialité
            </a>
          </li>
        </ul>
        <label className="mt-5 flex items-start gap-2.5 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-navy focus:ring-navy"
          />
          <span>J’ai lu et j’accepte les conditions générales d’utilisation et la politique de confidentialité.</span>
        </label>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <Button className="mt-5 w-full" disabled={!checked} loading={saving} onClick={accept}>
          Accepter et continuer
        </Button>
        <button type="button" onClick={signOut} className="mt-3 w-full text-center text-xs text-gray-400 hover:text-gray-600">
          Se déconnecter
        </button>
      </div>
    </div>
  )
}
