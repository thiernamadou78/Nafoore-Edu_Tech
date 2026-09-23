import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Calendar,
  Check,
  Download,
  FileWarning,
  KeyRound,
  MessageSquarePlus,
  Paperclip,
  Sparkles,
  UserPlus,
  X,
} from 'lucide-react'
import { api } from '../../lib/api'
import { formatDate } from '../../lib/format'
import { useAuth } from '../../context/AuthContext'
import { Alert } from '../../components/ui/Alert'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { PhotoUploader } from '../../components/ui/PhotoUploader'
import { STATUS_LABELS, STATUS_TONES } from './statusLabels'
import { CLASSE_LABELS, LEVEL_LABELS } from '../students/labels'

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy'

const DOCUMENT_TYPE_LABELS = {
  cv: 'CV',
  diplome: 'Diplôme',
  casier_judiciaire: 'Casier judiciaire',
  autre: 'Autre',
}

const ACCOUNT_STATUS_LABELS = {
  invite: 'Invité (mot de passe pas encore changé)',
  actif: 'Actif',
  suspendu: 'Suspendu',
}

const TABS = [
  { key: 'documents', label: 'Documents' },
  { key: 'entretien', label: 'Entretien & profil' },
  { key: 'notes', label: 'Notes internes' },
]

export function RecruitmentDetail() {
  const { id } = useParams()
  const { hasRole } = useAuth()
  const canAccessDocuments = hasRole('super_admin', 'admin', 'recruiter')
  const [application, setApplication] = useState(null)
  const [tab, setTab] = useState('documents')
  const [interviewDate, setInterviewDate] = useState('')
  const [notes, setNotes] = useState('')
  const [bio, setBio] = useState('')
  const [error, setError] = useState(null)
  const [savingAction, setSavingAction] = useState(null)

  const load = () =>
    api.get(`/teacher-applications/${id}`).then((data) => {
      setApplication(data)
      setNotes(data.interviewNotes ?? '')
      setBio(data.bio ?? '')
      setInterviewDate(data.interviewDate ? data.interviewDate.slice(0, 16) : '')
    })

  useEffect(() => {
    load().catch((err) => setError(err.message))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const run = async (action, fn) => {
    setSavingAction(action)
    setError(null)
    try {
      await fn()
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingAction(null)
    }
  }

  if (!application) {
    return error ? <Alert>{error}</Alert> : <p className="text-gray-500">Chargement…</p>
  }

  return (
    <div className="max-w-5xl">
      <Link
        to="/recrutement"
        className="mb-4 inline-flex items-center gap-1 text-sm text-navy hover:underline"
      >
        <ArrowLeft size={14} />
        Retour aux candidatures
      </Link>

      {error && <Alert>{error}</Alert>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr]">
        {/* Colonne identité */}
        <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          <Card className="p-6">
            <div className="flex flex-col items-center text-center">
              <PhotoUploader
                name={application.candidateName}
                photoUrl={application.photoUrl}
                uploadPath={`/teacher-applications/${id}/photo`}
                onChange={load}
              />
              <h1 className="mt-4 text-lg font-semibold text-gray-900">
                {application.candidateName}
              </h1>
              <Badge tone={STATUS_TONES[application.status]} className="mt-2">
                {STATUS_LABELS[application.status] ?? application.status}
              </Badge>
            </div>
            <div className="mt-4 space-y-1 border-t border-gray-100 pt-4 text-sm text-gray-600">
              <p>
                <span className="font-medium text-gray-500">Mail :</span> {application.candidateEmail}
              </p>
              {application.phone && (
                <p>
                  <span className="font-medium text-gray-500">Téléphone :</span> {application.phone}
                </p>
              )}
              <p>
                <span className="font-medium text-gray-500">Adresse :</span> {application.zone}
              </p>
            </div>
            <div className="mt-3 border-t border-gray-100 pt-3">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
                Matières
              </p>
              <div className="flex flex-wrap gap-1.5">
                {application.subjects.map((subject) => (
                  <Badge key={subject} tone="gold">
                    {subject}
                  </Badge>
                ))}
              </div>
            </div>
            {application.bio && (
              <div className="mt-3 border-t border-gray-100 pt-3">
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Bio
                </p>
                <p className="text-sm text-gray-600">{application.bio}</p>
              </div>
            )}
            {(application.levels?.length > 0 || application.classes?.length > 0) && (
              <div className="mt-3 border-t border-gray-100 pt-3">
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Niveaux enseignés
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {application.levels?.map((level) => (
                    <Badge key={level} tone="gray">
                      {LEVEL_LABELS[level] ?? level}
                    </Badge>
                  ))}
                  {application.classes?.map((classe) => (
                    <Badge key={classe} tone="indigo">
                      {CLASSE_LABELS[classe] ?? classe}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </Card>

          <Card className="p-6">
            <h2 className="mb-3 font-semibold text-gray-900">Décision</h2>
            {!application.bio && (
              <p className="mb-3 text-xs text-amber-700">
                Complète la bio dans l'onglet "Entretien &amp; profil" avant de valider. La photo
                sera demandée au prof à sa première connexion.
              </p>
            )}
            <div className="mb-3 rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
              <p className="mb-1 font-medium text-gray-700">Éléments du dossier</p>
              <ul className="space-y-0.5">
                {[
                  ['Présentation', Boolean(application.bio && application.bio.trim().length >= 20)],
                  ['CV', application.documents?.some((d) => d.type === 'cv')],
                  ['Diplôme', application.documents?.some((d) => d.type === 'diplome')],
                  [
                    'Casier judiciaire',
                    application.documents?.some((d) => d.type === 'casier_judiciaire'),
                  ],
                ].map(([label, ok]) => (
                  <li key={label} className={ok ? 'text-green-700' : 'text-amber-700'}>
                    {ok ? '✓' : '•'} {label} {ok ? 'fourni' : 'manquant'}
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-gray-400">
                « Documents requis » n'enverra au candidat que les éléments manquants.
              </p>
            </div>
            <div className="space-y-2">
              <Button
                variant="success"
                icon={Check}
                className="w-full"
                loading={savingAction === 'valide'}
                disabled={!application.bio}
                onClick={() =>
                  run('valide', () =>
                    api.patch(`/teacher-applications/${id}/decision`, { status: 'valide' }),
                  )
                }
              >
                Valider
              </Button>
              <Button
                variant="warning"
                icon={FileWarning}
                className="w-full"
                loading={savingAction === 'documents_requis'}
                onClick={() =>
                  run('documents_requis', () =>
                    api.patch(`/teacher-applications/${id}/decision`, {
                      status: 'documents_requis',
                    }),
                  )
                }
              >
                Documents requis
              </Button>
              <Button
                variant="danger"
                icon={X}
                className="w-full"
                loading={savingAction === 'refuse'}
                onClick={() =>
                  run('refuse', () =>
                    api.patch(`/teacher-applications/${id}/decision`, { status: 'refuse' }),
                  )
                }
              >
                Refuser
              </Button>
            </div>
          </Card>

          {application.status === 'valide' && (
            <Card className="p-6">
              <h2 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
                <UserPlus size={16} className="text-navy" />
                Compte enseignant
              </h2>
              {!application.teacherAccount ? (
                <>
                  <p className="mb-3 text-sm text-gray-500">
                    Aucun compte n'a encore été créé. La création génère un accès à l'espace
                    enseignant et lui envoie ses identifiants par email.
                  </p>
                  <Button
                    icon={UserPlus}
                    className="w-full"
                    loading={savingAction === 'create-account'}
                    onClick={() =>
                      run('create-account', () =>
                        api.post(`/teacher-applications/${id}/create-account`),
                      )
                    }
                  >
                    Créer le compte
                  </Button>
                </>
              ) : (
                <>
                  <p className="mb-3 text-sm text-gray-500">
                    Statut :{' '}
                    <span className="font-medium text-gray-700">
                      {ACCOUNT_STATUS_LABELS[application.teacherAccount.status] ??
                        application.teacherAccount.status}
                    </span>
                  </p>
                  <Button
                    variant="secondary"
                    icon={KeyRound}
                    className="w-full"
                    loading={savingAction === 'resend-credentials'}
                    onClick={() =>
                      run('resend-credentials', () =>
                        api.post(`/teacher-applications/${id}/resend-credentials`),
                      )
                    }
                  >
                    Renvoyer les identifiants
                  </Button>
                </>
              )}
            </Card>
          )}
        </div>

        {/* Colonne contenu */}
        <div>
          <div className="mb-5 flex flex-wrap gap-1 border-b border-gray-200">
            {TABS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                  tab === key
                    ? 'border-navy text-navy'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === 'documents' && (
            <Card className="p-6">
              <h2 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
                <Paperclip size={16} className="text-navy" />
                Documents
              </h2>
              {!canAccessDocuments ? (
                <p className="text-sm text-gray-500">Réservé aux Super Admin et Recruteurs.</p>
              ) : application.documents.length === 0 ? (
                <p className="text-sm text-gray-500">Aucun document déposé pour l'instant.</p>
              ) : (
                <div className="space-y-2">
                  {application.documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between text-sm">
                      <div>
                        <span className="font-medium text-gray-900">{doc.fileName}</span>
                        <span className="ml-2 text-gray-500">
                          {DOCUMENT_TYPE_LABELS[doc.type] ?? doc.type} ·{' '}
                          {formatDate(doc.createdAt)}
                        </span>
                      </div>
                      <button
                        onClick={async () => {
                          try {
                            const { url } = await api.get(
                              `/teacher-applications/${id}/documents/${doc.id}/download`,
                            )
                            window.open(url, '_blank', 'noopener')
                          } catch (err) {
                            setError(err.message)
                          }
                        }}
                        className="inline-flex items-center gap-1 text-navy hover:underline"
                      >
                        <Download size={14} />
                        Télécharger
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {tab === 'entretien' && (
            <div className="space-y-6">
              <Card className="p-6">
                <h2 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
                  <Calendar size={16} className="text-navy" />
                  Entretien
                </h2>
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Date d'entretien
                    </label>
                    <input
                      type="datetime-local"
                      value={interviewDate}
                      onChange={(e) => setInterviewDate(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <Button
                    icon={Calendar}
                    disabled={!interviewDate || savingAction === 'schedule'}
                    onClick={() =>
                      run('schedule', () =>
                        api.patch(`/teacher-applications/${id}/schedule-interview`, {
                          interviewDate: new Date(interviewDate).toISOString(),
                        }),
                      )
                    }
                  >
                    Planifier
                  </Button>
                </div>
              </Card>

              <Card className="p-6">
                <h2 className="mb-1 flex items-center gap-2 font-semibold text-gray-900">
                  <Sparkles size={16} className="text-navy" />
                  Profil enseignant (visible par les familles)
                </h2>
                <p className="mb-3 text-xs text-gray-500">
                  Bio rédigée par l'équipe Nafoore Education pour présenter le candidat aux
                  familles — requise avant de valider la candidature (photo dans la colonne de
                  gauche).
                </p>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={4}
                  className={`${inputClass} mb-3`}
                  placeholder="Ex : M. Barry est un professeur de physique aguerri, avec une méthodologie adaptée aux élèves en difficulté…"
                />
                <Button
                  icon={Sparkles}
                  disabled={bio.trim().length < 20 || savingAction === 'profile'}
                  onClick={() =>
                    run('profile', () => api.patch(`/teacher-applications/${id}/profile`, { bio }))
                  }
                >
                  Enregistrer le profil
                </Button>
              </Card>
            </div>
          )}

          {tab === 'notes' && (
            <Card className="p-6">
              <h2 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
                <MessageSquarePlus size={16} className="text-navy" />
                Notes internes
              </h2>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={5}
                className={`${inputClass} mb-3`}
                placeholder="Notes du recruteur (non visibles par le candidat)"
              />
              <Button
                icon={MessageSquarePlus}
                disabled={!notes || savingAction === 'notes'}
                onClick={() =>
                  run('notes', () =>
                    api.patch(`/teacher-applications/${id}/notes`, { interviewNotes: notes }),
                  )
                }
              >
                Enregistrer les notes
              </Button>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
