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
  UserPlus,
  X,
} from 'lucide-react'
import { api } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { Alert } from '../../components/ui/Alert'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { STATUS_LABELS, STATUS_TONES } from './statusLabels'

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy'

const DOCUMENT_TYPE_LABELS = {
  diplome: 'Diplôme',
  casier_judiciaire: 'Casier judiciaire',
  autre: 'Autre',
}

const ACCOUNT_STATUS_LABELS = {
  invite: 'Invité (mot de passe pas encore changé)',
  actif: 'Actif',
  suspendu: 'Suspendu',
}

export function RecruitmentDetail() {
  const { id } = useParams()
  const { hasRole } = useAuth()
  const canAccessDocuments = hasRole('super_admin', 'recruiter')
  const [application, setApplication] = useState(null)
  const [interviewDate, setInterviewDate] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState(null)
  const [savingAction, setSavingAction] = useState(null)

  const load = () =>
    api.get(`/teacher-applications/${id}`).then((data) => {
      setApplication(data)
      setNotes(data.interviewNotes ?? '')
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
    <div className="max-w-3xl">
      <Link
        to="/recrutement"
        className="mb-2 inline-flex items-center gap-1 text-sm text-navy hover:underline"
      >
        <ArrowLeft size={14} />
        Retour aux candidatures
      </Link>

      <div className="mb-1 flex items-center gap-3">
        <h1 className="text-xl font-semibold text-gray-900">{application.candidateName}</h1>
        <Badge tone={STATUS_TONES[application.status]}>
          {STATUS_LABELS[application.status] ?? application.status}
        </Badge>
      </div>
      <p className="mb-6 text-sm text-gray-500">
        {application.candidateEmail} · {application.zone} · {application.subjects.join(', ')}
      </p>

      {error && <Alert>{error}</Alert>}

      <Card className="mb-6 p-6">
        <h2 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
          <Paperclip size={16} className="text-navy" />
          Documents
        </h2>
        {!canAccessDocuments ? (
          <p className="text-sm text-gray-500">
            Réservé aux Super Admin et Recruteurs.
          </p>
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
                    {new Date(doc.createdAt).toLocaleDateString('fr-FR')}
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

      <Card className="mb-6 p-6">
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

      <Card className="mb-6 p-6">
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

      <Card className="p-6">
        <h2 className="mb-3 font-semibold text-gray-900">Décision</h2>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="success"
            icon={Check}
            disabled={savingAction === 'valide'}
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
            disabled={savingAction === 'documents_requis'}
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
            disabled={savingAction === 'refuse'}
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
        <Card className="mt-6 p-6">
          <h2 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
            <UserPlus size={16} className="text-navy" />
            Compte enseignant
          </h2>
          {!application.teacherAccount ? (
            <>
              <p className="mb-3 text-sm text-gray-500">
                Aucun compte n'a encore été créé pour ce candidat. La création
                génère un accès à l'espace enseignant et lui envoie ses
                identifiants par email.
              </p>
              <Button
                icon={UserPlus}
                disabled={savingAction === 'create-account'}
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
                disabled={savingAction === 'resend-credentials'}
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
  )
}
