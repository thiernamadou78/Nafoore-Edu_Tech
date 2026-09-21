import { useEffect, useState } from 'react'
import { Check, RefreshCw, X } from 'lucide-react'
import { api } from '../../lib/api'
import { useAutoRefresh } from '../../lib/useAutoRefresh'
import { formatDate } from '../../lib/format'
import { Alert } from '../../components/ui/Alert'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'

const STATUS_LABELS = {
  en_attente_prof: "En attente de l'enseignant",
  acceptee_prof: 'Accepté par le prof — à confirmer',
  refusee_prof: 'Décliné par le prof',
  confirmee: 'Confirmé',
  refusee_admin: 'Refusé',
}

const STATUS_TONES = {
  en_attente_prof: 'gray',
  acceptee_prof: 'amber',
  refusee_prof: 'red',
  confirmee: 'green',
  refusee_admin: 'red',
}

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy'

export function RenewalsList() {
  const [renewals, setRenewals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [rejectingId, setRejectingId] = useState(null)
  const [reason, setReason] = useState('')

  const load = () =>
    api
      .get('/renewals')
      .then(setRenewals)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))

  useEffect(() => {
    load()
  }, [])

  useAutoRefresh(() => {
    api
      .get('/renewals')
      .then(setRenewals)
      .catch(() => {})
  })

  const run = async (id, fn) => {
    setBusyId(id)
    setError(null)
    try {
      await fn()
      setRejectingId(null)
      setReason('')
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-baseline gap-2">
        <h1 className="text-xl font-semibold text-gray-900">Renouvellements</h1>
        <span className="text-sm text-gray-400">{renewals.length}</span>
      </div>

      {error && <Alert>{error}</Alert>}

      <Card className="overflow-hidden">
        {loading ? (
          <p className="p-6 text-sm text-gray-500">Chargement…</p>
        ) : renewals.length === 0 ? (
          <EmptyState
            icon={RefreshCw}
            title="Aucun renouvellement"
            description="Les demandes de renouvellement des familles apparaîtront ici."
          />
        ) : (
          <ul className="divide-y divide-gray-100">
            {renewals.map((renewal) => {
              const canConfirm = renewal.status === 'acceptee_prof'
              const canReject = ['en_attente_prof', 'acceptee_prof'].includes(renewal.status)
              return (
                <li key={renewal.id} className="p-4 text-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-gray-900">
                        {renewal.student.name}
                        {renewal.subject ? ` · ${renewal.subject}` : ''}
                      </p>
                      <p className="text-xs text-gray-500">
                        Famille : {renewal.familyName ?? '—'} · Enseignant : {renewal.teacher.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {renewal.periodMonths} mois demandés le {formatDate(renewal.createdAt)}
                        {renewal.endsAt && ` · fin actuelle : ${formatDate(renewal.endsAt)}`}
                      </p>
                      {renewal.teacherComment && (
                        <p className="mt-1 text-xs text-gray-600">
                          Commentaire du prof : {renewal.teacherComment}
                        </p>
                      )}
                      {renewal.adminReason && (
                        <p className="mt-1 text-xs text-gray-600">Motif : {renewal.adminReason}</p>
                      )}
                      {renewal.newRequestId && (
                        <a
                          href={`/demandes-professeur/${renewal.newRequestId}`}
                          className="mt-1 inline-block text-xs text-navy underline"
                        >
                          Voir la nouvelle demande de professeur
                        </a>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge tone={STATUS_TONES[renewal.status]}>
                        {STATUS_LABELS[renewal.status] ?? renewal.status}
                      </Badge>
                      {(canConfirm || canReject) && rejectingId !== renewal.id && (
                        <div className="flex gap-2">
                          {canConfirm && (
                            <Button
                              variant="success"
                              icon={Check}
                              loading={busyId === renewal.id}
                              onClick={() =>
                                run(renewal.id, () => api.patch(`/renewals/${renewal.id}/confirm`, {}))
                              }
                              className="px-3 py-1.5 text-xs"
                            >
                              Confirmer
                            </Button>
                          )}
                          {canReject && (
                            <Button
                              variant="secondary"
                              icon={X}
                              disabled={busyId !== null}
                              onClick={() => setRejectingId(renewal.id)}
                              className="px-3 py-1.5 text-xs"
                            >
                              Refuser
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  {rejectingId === renewal.id && (
                    <div className="mt-3 space-y-2 rounded-lg bg-gray-50 p-3">
                      <label className="block text-xs font-medium text-gray-600">
                        Motif du refus (envoyé à la famille) <span className="text-red-500">*</span>
                      </label>
                      <input
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className={inputClass}
                      />
                      <div className="flex gap-2">
                        <Button
                          variant="danger"
                          loading={busyId === renewal.id}
                          disabled={reason.trim().length < 3}
                          onClick={() =>
                            run(renewal.id, () =>
                              api.patch(`/renewals/${renewal.id}/reject`, { reason }),
                            )
                          }
                        >
                          Confirmer le refus
                        </Button>
                        <Button variant="secondary" onClick={() => setRejectingId(null)}>
                          Annuler
                        </Button>
                      </div>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </div>
  )
}
