import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Calendar, Check, FileWarning, MessageSquarePlus, X } from 'lucide-react'
import { api } from '../../lib/api'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { STATUS_LABELS, STATUS_TONES } from './statusLabels'

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy'

export function RecruitmentDetail() {
  const { id } = useParams()
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
    return error ? (
      <p className="text-red-600">{error}</p>
    ) : (
      <p className="text-gray-500">Chargement…</p>
    )
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

      {error && <p className="mb-4 text-red-600">{error}</p>}

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
    </div>
  )
}
