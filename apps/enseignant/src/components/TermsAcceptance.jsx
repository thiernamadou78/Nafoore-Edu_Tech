import { useState } from 'react'
import { FileCheck2, ShieldCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { Button } from './ui/Button'
import { CharterText } from './CharterText'

const VITRINE_URL = import.meta.env.VITE_VITRINE_URL || 'https://education.nafoore.com'

const COMMITMENTS = [
  'Utiliser les informations des élèves et des familles uniquement pour l’accompagnement.',
  'Ne les communiquer à personne en dehors de la famille et de l’équipe Nafoore.',
  'Ne pas en garder de copie hors de la plateforme (captures, photos de bulletins, contacts).',
  'Aucune photo ni vidéo de l’élève sans l’accord écrit de ses parents.',
  'Pronote : uniquement avec l’accord et en présence de l’élève ou de sa famille, sans enregistrer leurs identifiants.',
  'Protéger son accès (identifiants personnels, appareil verrouillé) et signaler tout incident.',
]

// Premiere connexion (ou nouvelle version) : l'enseignant accepte les CGU et
// la charte de confidentialite. Version et date enregistrees cote backend.
export function TermsAcceptance({ account, onAccepted }) {
  const { signOut } = useAuth()
  const [terms, setTerms] = useState(false)
  const [charter, setCharter] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [showCharter, setShowCharter] = useState(false)
  const isUpdate = Boolean(account.termsVersion || account.charterVersion)

  const accept = async () => {
    setSaving(true)
    setError(null)
    try {
      await api.patch('/teacher/me/accept-terms', {})
      await onAccepted()
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  const link = (path, label) => (
    <a href={`${VITRINE_URL}${path}`} target="_blank" rel="noreferrer" className="font-semibold text-navy underline">
      {label}
    </a>
  )

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4 py-10">
      <div className="w-full max-w-lg rounded-2xl bg-white p-7 shadow-xl">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-navy/10 text-navy">
          <FileCheck2 size={22} />
        </div>
        <h1 className="font-serif text-xl font-bold text-navy">
          {isUpdate ? 'Nos conditions évoluent' : 'Bienvenue sur Nafoore Education'}
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          {isUpdate
            ? 'Nos conditions d’utilisation ou notre charte de confidentialité ont été mises à jour. Merci d’en prendre connaissance pour continuer.'
            : 'Avant d’accéder à votre espace enseignant, merci de prendre connaissance de nos conditions d’utilisation et de la charte de confidentialité : vous allez accéder à des informations sur des élèves mineurs et leurs familles.'}
        </p>

        <div className="mt-4 rounded-xl border border-navy/10 bg-navy/5 p-4">
          <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-navy">
            <ShieldCheck size={16} />
            Charte de confidentialité — l’essentiel
          </p>
          <ul className="list-disc space-y-1 pl-5 text-xs text-gray-700">
            {COMMITMENTS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => setShowCharter((v) => !v)}
            className="mt-2 text-xs font-semibold text-navy underline"
          >
            {showCharter ? 'Masquer la charte complète' : 'Lire la charte complète'}
          </button>
          {showCharter && (
            <div className="mt-3 max-h-72 overflow-y-auto rounded-lg border border-gray-200 bg-white p-3">
              <CharterText />
            </div>
          )}
        </div>

        <div className="mt-5 space-y-3 text-sm text-gray-700">
          <label className="flex items-start gap-2.5">
            <input
              type="checkbox"
              checked={terms}
              onChange={(e) => setTerms(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-navy focus:ring-navy"
            />
            <span>
              J’ai lu et j’accepte les {link('/cgu', 'conditions générales d’utilisation')} et la{' '}
              {link('/confidentialite', 'politique de confidentialité')}.
            </span>
          </label>
          <label className="flex items-start gap-2.5">
            <input
              type="checkbox"
              checked={charter}
              onChange={(e) => setCharter(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-navy focus:ring-navy"
            />
            <span>
              Je m’engage à respecter la charte de confidentialité de l’enseignant ci-dessus.
            </span>
          </label>
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <Button className="mt-5 w-full" disabled={!terms || !charter} loading={saving} onClick={accept}>
          Accepter et continuer
        </Button>
        <button type="button" onClick={signOut} className="mt-3 w-full text-center text-xs text-gray-400 hover:text-gray-600">
          Se déconnecter
        </button>
      </div>
    </div>
  )
}
