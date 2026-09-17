import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Send, Sparkles } from 'lucide-react'
import { api } from '../../lib/api'
import { formatDate } from '../../lib/format'
import { Alert } from '../../components/ui/Alert'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import {
  FORMAT_LABELS,
  MATCHING_STATUS_LABELS,
  MATCHING_STATUS_TONES,
  TEACHER_REQUEST_STATUS_LABELS,
  TEACHER_REQUEST_STATUS_TONES,
} from './labels'

const CLOSED_STATUSES = ['acceptee', 'annulee']

export function TeacherRequestDetail() {
  const { id } = useParams()
  const [request, setRequest] = useState(null)
  const [teachers, setTeachers] = useState([])
  const [error, setError] = useState(null)
  const [proposingId, setProposingId] = useState(null)

  const load = () => api.get(`/teacher-requests/${id}`).then(setRequest)

  useEffect(() => {
    load().catch((err) => setError(err.message))
    api
      .get('/teachers?verified=true')
      .then(setTeachers)
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const proposeMatching = async (teacherId) => {
    setProposingId(teacherId)
    setError(null)
    try {
      await api.post(`/teacher-requests/${id}/matchings`, { teacherId })
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setProposingId(null)
    }
  }

  if (!request) {
    return error ? <Alert>{error}</Alert> : <p className="text-gray-500">Chargement…</p>
  }

  const canPropose = !CLOSED_STATUSES.includes(request.status)
  // Un prof ne peut être proposé qu'une seule fois pour une même demande.
  const alreadyProposedIds = new Set(request.matchings.map((m) => m.teacher.id))
  const interestedIds = new Set((request.interests ?? []).map((i) => i.teacher.id))
  // Une seule liste, filtree sur la matiere demandee : proposer un prof de
  // maths pour une demande de francais n'a pas de sens. Les interesses
  // remontent en tete plutot que d'avoir une liste separee.
  const matchingTeachers = teachers
    .filter((t) => t.subjects.includes(request.subject))
    .map((t) => ({ ...t, interested: interestedIds.has(t.id) }))
    .sort((a, b) => Number(b.interested) - Number(a.interested) || a.name.localeCompare(b.name))

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
        {request.student.name} ·{' '}
        {request.student.parentLead?.portalAccount?.familyName ??
          request.student.parentLead?.name ??
          '—'}{' '}
        ({request.student.parentLead?.email ?? '—'})
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
          {request.durationMinutes && (
            <div>
              <dt className="text-gray-500">Durée de séance souhaitée</dt>
              <dd className="text-gray-800">{request.durationMinutes} min</dd>
            </div>
          )}
          {request.availability && (
            <div className="col-span-2">
              <dt className="text-gray-500">Disponibilités</dt>
              <dd className="text-gray-800">{request.availability}</dd>
            </div>
          )}
        </dl>
      </Card>

      <Card className="mb-6 p-6">
        <h2 className="mb-1 font-semibold text-gray-900">Proposer un enseignant</h2>
        <p className="mb-3 text-sm text-gray-500">
          Enseignants vérifiés qui donnent des cours de {request.subject}
          {matchingTeachers.some((t) => t.interested) && ' — les intéressés remontent en tête.'}
        </p>
        {!canPropose && <p className="text-sm text-gray-500">Cette demande est clôturée.</p>}
        {canPropose && matchingTeachers.length === 0 ? (
          <p className="text-sm text-gray-500">
            Aucun enseignant vérifié ne donne cette matière pour l'instant.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {matchingTeachers.map((teacher) => {
              const alreadyProposed = alreadyProposedIds.has(teacher.id)
              return (
                <li key={teacher.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 font-medium text-gray-800">
                      {teacher.name}
                      {teacher.interested && (
                        <Badge tone="gold" icon={Sparkles}>
                          Intéressé
                        </Badge>
                      )}
                    </p>
                    <p className="truncate text-xs text-gray-400">{teacher.subjects.join(', ')}</p>
                  </div>
                  {alreadyProposed ? (
                    <Badge tone="gray">Déjà proposé</Badge>
                  ) : (
                    <Button
                      variant="secondary"
                      icon={Send}
                      loading={proposingId === teacher.id}
                      disabled={!canPropose || proposingId !== null}
                      onClick={() => proposeMatching(teacher.id)}
                      className="shrink-0 px-3 py-1.5 text-xs"
                    >
                      Proposer
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Card>

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
                    {formatDate(matching.createdAt)}
                    {matching.respondedAt &&
                      ` · répondu le ${formatDate(matching.respondedAt)}`}
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
