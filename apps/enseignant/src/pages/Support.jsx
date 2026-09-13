import { useEffect, useState } from 'react'
import { LifeBuoy, Send, SquarePen } from 'lucide-react'
import { api } from '../lib/api'
import { formatDateTime as formatTime } from '../lib/format'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { Spinner } from '../components/ui/Spinner'

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy'

const STATUS_LABELS = { ouvert: 'Ouvert', traite: 'Traité' }
const STATUS_TONES = { ouvert: 'amber', traite: 'green' }

export function Support() {
  const [tickets, setTickets] = useState(null)
  const [error, setError] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [showNewTicket, setShowNewTicket] = useState(false)
  const [newTicketForm, setNewTicketForm] = useState({ subject: '', message: '' })
  const [creating, setCreating] = useState(false)

  const load = () =>
    api
      .get('/teacher/support')
      .then((data) => {
        setTickets(data)
        setSelectedId((current) => current ?? data[0]?.id ?? null)
      })
      .catch((err) => setError(err.message))

  useEffect(() => {
    load()
  }, [])

  const handleReply = (e) => {
    e.preventDefault()
    if (!draft.trim() || !selectedId) return
    setSending(true)
    api
      .post(`/teacher/support/${selectedId}/messages`, { body: draft })
      .then(() => {
        setDraft('')
        return load()
      })
      .catch((err) => setError(err.message))
      .finally(() => setSending(false))
  }

  const handleCreateTicket = (e) => {
    e.preventDefault()
    setCreating(true)
    setError(null)
    api
      .post('/teacher/support', newTicketForm)
      .then((ticket) => {
        setShowNewTicket(false)
        setNewTicketForm({ subject: '', message: '' })
        setSelectedId(ticket.id)
        return load()
      })
      .catch((err) => setError(err.message))
      .finally(() => setCreating(false))
  }

  if (error && !tickets) return <p className="text-red-600">{error}</p>
  if (!tickets) return <Spinner />

  const selected = tickets.find((t) => t.id === selectedId)

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-navy">Support</h1>
          <p className="mt-1 text-sm text-gray-500">
            Une question, un souci technique, un imprévu avec une famille ? L'équipe Nafoore
            Education te répond ici.
          </p>
        </div>
        <Button
          variant="secondary"
          icon={SquarePen}
          onClick={() => setShowNewTicket((v) => !v)}
        >
          Nouveau ticket
        </Button>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {showNewTicket && (
        <Card className="mb-6 p-5">
          <form onSubmit={handleCreateTicket} className="space-y-3">
            <input
              required
              placeholder="Sujet"
              value={newTicketForm.subject}
              onChange={(e) => setNewTicketForm((f) => ({ ...f, subject: e.target.value }))}
              className={inputClass}
            />
            <textarea
              required
              rows={4}
              placeholder="Décris ta demande…"
              value={newTicketForm.message}
              onChange={(e) => setNewTicketForm((f) => ({ ...f, message: e.target.value }))}
              className={`${inputClass} resize-y`}
            />
            <Button type="submit" disabled={creating}>
              Envoyer
            </Button>
          </form>
        </Card>
      )}

      {tickets.length === 0 ? (
        <Card className="overflow-hidden">
          <EmptyState
            icon={LifeBuoy}
            title="Aucun ticket pour l'instant"
            description="Envoie un nouveau ticket pour contacter l'équipe Nafoore Education."
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-[240px_1fr]">
          <Card className="overflow-hidden p-0">
            {tickets.map((ticket) => (
              <button
                key={ticket.id}
                onClick={() => setSelectedId(ticket.id)}
                className={`flex w-full flex-col gap-1 border-b border-gray-100 px-4 py-3 text-left text-sm last:border-0 ${
                  ticket.id === selectedId ? 'bg-gold-400/10 font-medium text-navy' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate">{ticket.subject}</span>
                  <Badge tone={STATUS_TONES[ticket.status]}>
                    {STATUS_LABELS[ticket.status] ?? ticket.status}
                  </Badge>
                </span>
                <span className="text-xs text-gray-400">{formatTime(ticket.createdAt)}</span>
              </button>
            ))}
          </Card>

          <Card className="flex flex-col p-5">
            {selected && (
              <>
                <div className="mb-3 flex items-center gap-2">
                  <h2 className="font-semibold text-gray-900">{selected.subject}</h2>
                  <Badge tone={STATUS_TONES[selected.status]}>
                    {STATUS_LABELS[selected.status] ?? selected.status}
                  </Badge>
                </div>
                <div className="mb-4 flex-1 space-y-3">
                  <div className="max-w-[75%] rounded-xl bg-gray-100 px-3.5 py-2 text-sm text-gray-800">
                    <p className="whitespace-pre-wrap break-words">{selected.message}</p>
                    <p className="mt-1 text-[11px] text-gray-400">{formatTime(selected.createdAt)}</p>
                  </div>
                  {selected.messages.map((message) => (
                    <div
                      key={message.id}
                      className={`max-w-[75%] rounded-xl px-3.5 py-2 text-sm ${
                        message.sender === 'teacher'
                          ? 'ml-auto bg-navy text-white'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{message.body}</p>
                      <p
                        className={`mt-1 text-[11px] ${
                          message.sender === 'teacher' ? 'text-white/60' : 'text-gray-400'
                        }`}
                      >
                        {formatTime(message.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
                <form onSubmit={handleReply} className="flex items-end gap-2">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleReply(e)
                      }
                    }}
                    placeholder="Écrire un message…"
                    rows={3}
                    className="max-h-40 min-h-[3rem] flex-1 resize-y rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
                  />
                  <Button type="submit" icon={Send} disabled={sending || !draft.trim()}>
                    Envoyer
                  </Button>
                </form>
              </>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}
