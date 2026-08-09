import { useEffect, useState } from 'react'
import { CheckCircle2, LifeBuoy } from 'lucide-react'
import { api } from '../../lib/api'
import { Alert } from '../../components/ui/Alert'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'

const STATUS_LABELS = { ouvert: 'Ouvert', traite: 'Traité' }
const STATUS_TONES = { ouvert: 'amber', traite: 'green' }

export function SupportTicketsList() {
  const [tickets, setTickets] = useState(null)
  const [error, setError] = useState(null)
  const [savingId, setSavingId] = useState(null)

  const load = () =>
    api
      .get('/admin/support-tickets')
      .then(setTickets)
      .catch((err) => setError(err.message))

  useEffect(() => {
    load()
  }, [])

  const markTreated = (id) => {
    setSavingId(id)
    api
      .patch(`/admin/support-tickets/${id}`, { status: 'traite' })
      .then(load)
      .catch((err) => setError(err.message))
      .finally(() => setSavingId(null))
  }

  return (
    <div>
      <div className="mb-6 flex items-baseline gap-2">
        <h1 className="text-xl font-semibold text-gray-900">Support</h1>
        {tickets && <span className="text-sm text-gray-400">{tickets.length}</span>}
      </div>

      {error && <Alert>{error}</Alert>}

      <Card className="overflow-hidden">
        {!tickets ? (
          <p className="p-6 text-sm text-gray-500">Chargement…</p>
        ) : tickets.length === 0 ? (
          <EmptyState
            icon={LifeBuoy}
            title="Aucun ticket"
            description="Les demandes de support envoyées par les enseignants apparaîtront ici."
          />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">Enseignant</th>
                <th className="px-4 py-3 font-medium">Sujet</th>
                <th className="px-4 py-3 font-medium">Message</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tickets.map((ticket) => (
                <tr key={ticket.id}>
                  <td className="px-4 py-3 font-medium text-gray-900">{ticket.teacher.name}</td>
                  <td className="px-4 py-3 text-gray-700">{ticket.subject}</td>
                  <td className="max-w-xs truncate px-4 py-3 text-gray-500">{ticket.message}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(ticket.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={STATUS_TONES[ticket.status]}>
                      {STATUS_LABELS[ticket.status] ?? ticket.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {ticket.status === 'ouvert' && (
                      <button
                        onClick={() => markTreated(ticket.id)}
                        disabled={savingId === ticket.id}
                        className="inline-flex items-center gap-1 text-xs text-navy hover:underline"
                      >
                        <CheckCircle2 size={13} />
                        Marquer traité
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
