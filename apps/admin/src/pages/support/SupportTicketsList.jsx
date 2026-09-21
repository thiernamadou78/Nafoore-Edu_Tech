import { useEffect, useState } from 'react'
import { CheckCircle2, LifeBuoy, Loader2, RotateCcw, Send } from 'lucide-react'
import { api } from '../../lib/api'
import { useAutoRefresh } from '../../lib/useAutoRefresh'
import { formatDate, formatDateTime } from '../../lib/format'
import { Alert } from '../../components/ui/Alert'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { Modal } from '../../components/ui/Modal'

const STATUS_LABELS = { ouvert: 'Ouvert', traite: 'Traité' }
const STATUS_TONES = { ouvert: 'amber', traite: 'green' }

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy'

const formatTime = formatDateTime

function TicketDetailModal({ ticket, onClose, onChanged }) {
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [togglingStatus, setTogglingStatus] = useState(false)
  const [error, setError] = useState(null)

  if (!ticket) return null

  const handleReply = (e) => {
    e.preventDefault()
    if (!reply.trim()) return
    setSending(true)
    setError(null)
    api
      .post(`/admin/support-tickets/${ticket.id}/messages`, { body: reply })
      .then(() => {
        setReply('')
        return onChanged()
      })
      .catch((err) => setError(err.message))
      .finally(() => setSending(false))
  }

  const toggleStatus = () => {
    const nextStatus = ticket.status === 'ouvert' ? 'traite' : 'ouvert'
    setTogglingStatus(true)
    api
      .patch(`/admin/support-tickets/${ticket.id}`, { status: nextStatus })
      .then(onChanged)
      .catch((err) => setError(err.message))
      .finally(() => setTogglingStatus(false))
  }

  return (
    <Modal open onClose={onClose} title={ticket.subject} size="lg">
      <div className="mb-3 flex items-center gap-2 text-sm text-gray-500">
        <span className="font-medium text-gray-900">{ticket.teacher.name}</span>
        <span>·</span>
        <span>{formatTime(ticket.createdAt)}</span>
        <Badge tone={STATUS_TONES[ticket.status]}>
          {STATUS_LABELS[ticket.status] ?? ticket.status}
        </Badge>
      </div>

      {error && <Alert className="mb-3">{error}</Alert>}

      <div className="mb-4 max-h-96 space-y-3 overflow-y-auto rounded-lg border border-gray-100 bg-gray-50 p-4">
        <div className="max-w-[85%] rounded-xl bg-gray-100 px-3.5 py-2 text-sm text-gray-800">
          <p className="whitespace-pre-wrap break-words">{ticket.message}</p>
          <p className="mt-1 text-[11px] text-gray-400">{formatTime(ticket.createdAt)}</p>
        </div>
        {ticket.messages.map((message) => (
          <div
            key={message.id}
            className={`max-w-[85%] rounded-xl px-3.5 py-2 text-sm ${
              message.sender === 'admin'
                ? 'ml-auto bg-navy text-white'
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            <p className="whitespace-pre-wrap break-words">{message.body}</p>
            <p className={`mt-1 text-[11px] ${message.sender === 'admin' ? 'text-white/60' : 'text-gray-400'}`}>
              {formatTime(message.createdAt)}
            </p>
          </div>
        ))}
      </div>

      <form onSubmit={handleReply} className="mb-4 flex items-end gap-2">
        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Répondre à l'enseignant…"
          rows={3}
          className={`${inputClass} resize-y`}
        />
        <Button type="submit" icon={Send} disabled={sending || !reply.trim()}>
          Envoyer
        </Button>
      </form>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={toggleStatus}
          disabled={togglingStatus}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-navy hover:underline disabled:cursor-not-allowed disabled:opacity-50"
        >
          {togglingStatus ? (
            <Loader2 size={13} className="animate-spin" />
          ) : ticket.status === 'ouvert' ? (
            <CheckCircle2 size={13} />
          ) : (
            <RotateCcw size={13} />
          )}
          {ticket.status === 'ouvert' ? 'Marquer traité' : 'Rouvrir le ticket'}
        </button>
      </div>
    </Modal>
  )
}

export function SupportTicketsList() {
  const [tickets, setTickets] = useState(null)
  const [error, setError] = useState(null)
  const [selectedId, setSelectedId] = useState(null)

  const load = () =>
    api
      .get('/admin/support-tickets')
      .then(setTickets)
      .catch((err) => setError(err.message))

  useEffect(() => {
    load()
  }, [])

  useAutoRefresh(() => {
    api
      .get('/admin/support-tickets')
      .then(setTickets)
      .catch(() => {})
  })

  const selected = tickets?.find((t) => t.id === selectedId) ?? null

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
                <tr
                  key={ticket.id}
                  onClick={() => setSelectedId(ticket.id)}
                  className="cursor-pointer hover:bg-gray-50"
                >
                  <td className="px-4 py-3 font-medium text-gray-900">{ticket.teacher.name}</td>
                  <td className="px-4 py-3 text-gray-700">{ticket.subject}</td>
                  <td className="max-w-xs truncate px-4 py-3 text-gray-500">{ticket.message}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {formatDate(ticket.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={STATUS_TONES[ticket.status]}>
                      {STATUS_LABELS[ticket.status] ?? ticket.status}
                    </Badge>
                    {ticket.messages.length > 0 && (
                      <span className="ml-1.5 text-[11px] text-gray-400">
                        {ticket.messages.length} réponse{ticket.messages.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedId(ticket.id)
                      }}
                      className="text-xs font-medium text-navy hover:underline"
                    >
                      Voir / Répondre
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <TicketDetailModal
        ticket={selected}
        onClose={() => setSelectedId(null)}
        onChanged={load}
      />
    </div>
  )
}
