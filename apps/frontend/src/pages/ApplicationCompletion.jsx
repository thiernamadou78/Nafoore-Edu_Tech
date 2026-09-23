import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  DOCUMENT_FORMATS_HINT,
  uploadErrorMessage,
  validateUploads,
} from '../lib/fileValidation'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const STATUS_LABELS = {
  preselection: 'En présélection',
  entretien_planifie: 'Entretien planifié',
  entretien_realise: 'Entretien réalisé',
  documents_requis: 'Documents requis',
  valide: 'Validée',
  refuse: 'Refusée',
}

const DOCUMENT_TYPE_LABELS = {
  cv: 'CV',
  diplome: 'Diplôme',
  casier_judiciaire: 'Casier judiciaire',
  autre: 'Document',
}

const isProfileComplete = (application) =>
  Boolean(application?.bio && application.bio.trim().length >= 20) &&
  (application?.documents ?? []).some((doc) => doc.type === 'cv') &&
  (application?.documents ?? []).some((doc) => doc.type === 'diplome') &&
  (application?.documents ?? []).some((doc) => doc.type === 'casier_judiciaire')

export default function ApplicationCompletion() {
  const { token } = useParams()
  const [application, setApplication] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [bio, setBio] = useState('')
  const [cv, setCv] = useState(null)
  const [diplomas, setDiplomas] = useState([])
  const [criminalRecord, setCriminalRecord] = useState(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [fileErrors, setFileErrors] = useState({})

  const pickFiles = (field, kind, event, apply) => {
    const files = Array.from(event.target.files ?? [])
    const error = validateUploads(files, kind)
    setFileErrors((prev) => ({ ...prev, [field]: error }))
    if (error) {
      event.target.value = ''
      apply(null)
      return
    }
    apply(files)
  }

  const fetchApplication = async () => {
    const res = await fetch(`${API_URL}/teacher-applications/public/${token}`)
    if (!res.ok) throw new Error('Ce lien est invalide ou a expiré.')
    return res.json()
  }

  const load = () => {
    fetchApplication()
      .then((data) => {
        setApplication(data)
        setBio(data.bio ?? '')
      })
      .catch((err) => setLoadError(err.message))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const locked = application && ['valide', 'refuse'].includes(application.status)

  const handleValidate = async () => {
    if (locked || saving) return

    const bioChanged = bio.trim() !== (application.bio ?? '').trim()
    if (bioChanged && bio.trim().length > 0 && bio.trim().length < 20) {
      setMessage('La présentation doit faire au moins 20 caractères.')
      return
    }

    setSaving(true)
    setMessage('')

    const jobs = []

    if (bioChanged && bio.trim().length >= 20) {
      jobs.push({
        type: 'bio',
        promise: fetch(`${API_URL}/teacher-applications/public/${token}/profile`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bio: bio.trim() }),
        }).then(async (res) => {
          if (!res.ok) {
            const data = await res.json().catch(() => ({}))
            throw new Error(data.message || "Échec de l'enregistrement de la présentation.")
          }
        }),
      })
    }

    if (cv || diplomas.length > 0 || criminalRecord) {
      const formData = new FormData()
      if (cv) formData.append('cv', cv)
      diplomas.forEach((file) => formData.append('diplomas', file))
      if (criminalRecord) formData.append('criminalRecord', criminalRecord)
      jobs.push({
        type: 'documents',
        promise: fetch(`${API_URL}/teacher-applications/public/${token}/documents`, {
          method: 'POST',
          body: formData,
        }).then(async (res) => {
          if (!res.ok) {
            const data = await res.json().catch(() => ({}))
            throw new Error(uploadErrorMessage(res, data, "Échec de l'envoi des documents."))
          }
        }),
      })
    }

    const results = await Promise.allSettled(jobs.map((job) => job.promise))
    const failures = []
    const succeededTypes = []
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        failures.push(result.reason.message)
      } else {
        succeededTypes.push(jobs[index].type)
        if (jobs[index].type === 'documents') {
          setCv(null)
          setDiplomas([])
          setCriminalRecord(null)
        }
      }
    })

    try {
      const data = await fetchApplication()
      setApplication(data)
      setBio(data.bio ?? '')
      if (failures.length > 0) {
        setMessage(failures.join(' '))
      } else if (isProfileComplete(data)) {
        setMessage('')
      } else if (succeededTypes.includes('documents')) {
        setMessage('Documents ajoutés.')
      } else if (jobs.length > 0) {
        setMessage('Profil mis à jour.')
      } else {
        setMessage('Ton profil n\'est pas encore complet : ajoute ta présentation et tes documents.')
      }
    } catch (err) {
      setMessage(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loadError) {
    return (
      <section className="py-24 bg-navy min-h-[60vh] flex items-center justify-center">
        <p className="text-white/70 font-sans text-sm">{loadError}</p>
      </section>
    )
  }

  if (!application) {
    return (
      <section className="py-24 bg-navy min-h-[60vh] flex items-center justify-center">
        <p className="text-white/70 font-sans text-sm">Chargement…</p>
      </section>
    )
  }

  if (isProfileComplete(application)) {
    const quit = () => {
      window.close()
      // window.close() est ignore par le navigateur si l'onglet n'a pas ete
      // ouvert par un script (cas d'un lien recu par email) : on retombe alors
      // sur l'accueil du site.
      setTimeout(() => {
        window.location.href = '/'
      }, 300)
    }
    return (
      <section className="py-24 bg-navy min-h-[70vh] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl">
          <div className="w-14 h-14 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
            ✓
          </div>
          <h1 className="font-serif text-xl font-bold text-gray-900 mb-2">Dossier complet !</h1>
          <p className="font-sans text-sm text-gray-500 mb-6">
            Merci {application.candidateName}, ta présentation et tes documents ont bien été
            envoyés. Notre équipe va les examiner et reviendra vers toi.
          </p>
          <button
            type="button"
            onClick={quit}
            className="bg-navy text-white font-sans font-bold text-sm py-2.5 px-6 rounded-full hover:bg-navy/90 transition-all"
          >
            Quitter
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="py-24 bg-navy relative overflow-hidden min-h-[70vh]">
      <div
        className="absolute bottom-0 left-0 w-96 h-96 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(234,179,8,0.08) 0%, transparent 70%)',
          transform: 'translate(-30%, 30%)',
        }}
      />
      <div className="max-w-2xl mx-auto px-4 relative">
        <div className="inline-flex items-center gap-2 bg-white/10 text-gold-400 font-sans text-xs font-bold uppercase tracking-widest px-3.5 py-1.5 rounded-full mb-6">
          <span className="w-1 h-1 bg-gold-400 rounded-full" />
          {STATUS_LABELS[application.status] ?? application.status}
        </div>
        <h1 className="font-serif text-3xl font-bold text-white mb-2">
          Complète ton dossier, {application.candidateName}
        </h1>
        <p className="font-sans text-white/60 text-sm mb-8">
          Complète les éléments manquants de ton dossier, puis valide-le en une seule fois.
          Tu pourras ajouter ta photo de profil à ta première connexion.
        </p>

        {locked && (
          <div className="bg-white/10 text-white/80 font-sans text-sm rounded-xl px-4 py-3 mb-6">
            Cette candidature n'est plus modifiable ({STATUS_LABELS[application.status]}).
          </div>
        )}

        {message && (
          <div className="bg-white/10 text-white font-sans text-sm rounded-xl px-4 py-3 mb-6">
            {message}
          </div>
        )}

        <div className="bg-white rounded-2xl p-8 shadow-2xl shadow-black/20 mb-6">
          <label className="block font-sans text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            Ta présentation (visible par les familles)
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            disabled={locked}
            rows={5}
            minLength={20}
            placeholder="Présente ton parcours, ta méthode pédagogique, tes points forts…"
            className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 font-sans text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-navy/30 transition-colors disabled:bg-gray-50"
          />
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-2xl shadow-black/20 mb-6">
          <label className="block font-sans text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            Documents
          </label>
          {application.documents?.length > 0 && (
            <ul className="mb-4 font-sans text-sm text-gray-700 space-y-1.5">
              {application.documents.map((doc) => (
                <li key={doc.id} className="flex items-center gap-1.5">
                  <span className="text-green-600">✓</span>
                  {DOCUMENT_TYPE_LABELS[doc.type] ?? doc.type} ajouté — {doc.fileName}
                </li>
              ))}
            </ul>
          )}
          <ul className="mb-3 font-sans text-sm space-y-1.5">
            {[
              ['cv', 'CV'],
              ['diplome', 'Diplôme'],
              ['casier_judiciaire', 'Casier judiciaire'],
            ].map(([type, label]) =>
              (application.documents ?? []).some((doc) => doc.type === type) ? null : (
                <li key={type} className="text-amber-700">
                  • {label} : à fournir
                </li>
              ),
            )}
          </ul>
          <p className="mb-4 font-sans text-xs text-gray-400">
            Formats acceptés : {DOCUMENT_FORMATS_HINT}
          </p>
          <div className="mb-4">
            <label className="block font-sans text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
              CV
            </label>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              disabled={locked}
              onChange={(e) => pickFiles('cv', 'document', e, (files) => setCv(files?.[0] ?? null))}
              className="w-full font-sans text-xs text-gray-500"
            />
            {fileErrors.cv && (
              <p className="mt-1.5 font-sans text-xs text-red-600">{fileErrors.cv}</p>
            )}
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-sans text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                Diplômes
              </label>
              <input
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png"
                disabled={locked}
                onChange={(e) => pickFiles('diplomas', 'document', e, (files) => setDiplomas(files ?? []))}
                className="w-full font-sans text-xs text-gray-500"
              />
              {fileErrors.diplomas && (
                <p className="mt-1.5 font-sans text-xs text-red-600">{fileErrors.diplomas}</p>
              )}
            </div>
            <div>
              <label className="block font-sans text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                Casier judiciaire (B3)
              </label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                disabled={locked}
                onChange={(e) =>
                  pickFiles('criminalRecord', 'document', e, (files) => setCriminalRecord(files?.[0] ?? null))
                }
                className="w-full font-sans text-xs text-gray-500"
              />
              {fileErrors.criminalRecord && (
                <p className="mt-1.5 font-sans text-xs text-red-600">{fileErrors.criminalRecord}</p>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleValidate}
          disabled={locked || saving}
          className="w-full bg-gold-400 text-navy font-sans font-bold text-sm py-3.5 px-6 rounded-full hover:bg-gold-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Validation en cours…' : 'Valider mon profil'}
        </button>
      </div>

    </section>
  )
}
