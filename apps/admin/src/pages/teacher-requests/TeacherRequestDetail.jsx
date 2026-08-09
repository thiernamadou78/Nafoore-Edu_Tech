import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Send } from 'lucide-react'
import { api } from '../../lib/api'
import { Alert } from '../../components/ui/Alert'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Modal } from '../../components/ui/Modal'
import {
  FORMAT_LABELS,
  MATCHING_STATUS_LABELS,
  MATCHING_STATUS_TONES,
  TEACHER_REQUEST_STATUS_LABELS,
  TEACHER_REQUEST_STATUS_TONES,
} from './labels'

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy'

const CLOSED_STATUSES = ['proposition_envoyee', 'acceptee', 'annulee']

export function TeacherRequestDetail() {
  const { id } = useParams()
  const [request, setRequest] = useState(null)
  const [teachers, setTeachers] = useState([])
  const [selectedTeacherId, setSelectedTeacherId] = useState('')
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)

  const load = () => api.get(`/teacher-requests/${id}`).then(setRequest)

  useEffect(() => {
    load().catch((err) => setError(err.message))
    api
      .get('/teachers?verified=true')
      .then(setTeachers)
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const proposeMatching = async () => {
    setSaving(true)
    setError(null)
    try {
      await api.post(`/teacher-requests/${id}/matchings`, { teacherId: selectedTeacherId })
      await load()
      setModalOpen(false)
      setSelectedTeacherId('')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (!request) {
    return error ? <Alert>{error}</Alert> : <p className="text-gray-500">Chargement…</p>
  }

  const canPropose = !CLOSED_STATUSES.includes(request.status)

  return (
    <div className="max-w-3xl">
      <Link
        to="/demandes-professeur"
        className="mb-2 inline-flex items-center gap-1 text-sm text-navy hover:underline"
      >
        <ArrowLeft size={14} />
        Retour aux demandes
      </Link>

      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-xl font-semibold text-gray-900">{request.subject}</h1>
        <Badge tone={TEACHER_REQUEST_STATUS_TONES[request.status]}>
          {TEACHER_REQUEST_STATUS_LABELS[request.status] ?? request.status}
        </Badge>
      </div>
      <p className="-mt-4 mb-6 text-sm text-gray-500">
        {request.student.name} · {request.student.parentLead?.name ?? '—'} (
        {request.student.parentLead?.email ?? '—'})
      </p>

      {error && <Alert>{error}</Alert>}

      <Card className="mb-6 p-6">
        <h2 className="mb-3 font-semibold text-gray-900">Détails de la demande</h2>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-gray-500">Format</dt>
            <dd className="text-gray-800">{FORMAT_LABELS[request.format] ?? request.format}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Fréquence</dt>
            <dd className="text-gray-800">{request.frequency}</dd>
          </div>
          {request.availability && (
            <div className="col-span-2">
              <dt className="text-gray-500">Disponibilités</dt>
              <dd className="text-gray-800">{request.availability}</dd>
            </div>
          )}
        </dl>
      </Card>

      <Card className="mb-6 p-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Proposer un enseignant</h2>
          <Button icon={Send} disabled={!canPropose} onClick={() => setModalOpen(true)}>
            Proposer
          </Button>
        </div>
        {!canPropose && (
          <p className="text-sm text-gray-500">
            Une proposition est déjà en attente de réponse, ou la demande est clôturée.
          </p>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Proposer un enseignant">
        <select
          value={selectedTeacherId}
          onChange={(e) => setSelectedTeacherId(e.target.value)}
          className={`${inputClass} mb-5`}
        >
          <option value="">Choisir un enseignant vérifié</option>
          {teachers.map((teacher) => (
            <option key={teacher.id} value={teacher.id}>
              {teacher.name} — {teacher.subjects.join(', ')}
            </option>
          ))}
        </select>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>
            Annuler
          </Button>
          <Button icon={Send} disabled={!selectedTeacherId || saving} onClick={proposeMatching}>
            Confirmer
          </Button>
        </div>
      </Modal>

      <Card className="p-6">
        <h2 className="mb-3 font-semibold text-gray-900">Historique des propositions</h2>
        {request.matchings.length === 0 ? (
          <p className="text-sm text-gray-500">Aucune proposition pour l'instant.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {request.matchings.map((matching) => (
              <li key={matching.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <p className="font-medium text-gray-800">{matching.teacher.name}</p>
                  <p className="text-xs text-gray-400">
                    Proposé par {matching.proposedBy.name} le{' '}
                    {new Date(matching.createdAt).toLocaleDateString('fr-FR')}
                    {matching.respondedAt &&
                      ` · répondu le ${new Date(matching.respondedAt).toLocaleDateString('fr-FR')}`}
                  </p>
                  {matching.refusalReason && (
                    <p className="mt-1 text-xs text-gray-500">Motif : {matching.refusalReason}</p>
                  )}
                </div>
                <Badge tone={MATCHING_STATUS_TONES[matching.status]}>
                  {MATCHING_STATUS_LABELS[matching.status] ?? matching.status}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
