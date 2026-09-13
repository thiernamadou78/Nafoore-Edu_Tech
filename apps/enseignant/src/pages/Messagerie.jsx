import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { MessageSquare, Send, SquarePen } from 'lucide-react'
import { api } from '../lib/api'
import { formatDateTime as formatTime } from '../lib/format'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { Spinner } from '../components/ui/Spinner'

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy'

export function Messagerie() {
  const { refreshUnreadCount } = useOutletContext()
  const [threads, setThreads] = useState(null)
  const [families, setFamilies] = useState(null)
  const [error, setError] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [showNewMessage, setShowNewMessage] = useState(false)
  const [recipientType, setRecipientType] = useState('famille') // 'famille' | 'admin'
  const [newThreadLeadId, setNewThreadLeadId] = useState('')
  const [adminForm, setAdminForm] = useState({ subject: '', message: '' })
  const [starting, setStarting] = useState(false)

  const load = () =>
    Promise.all([api.get('/teacher/messages'), api.get('/teacher/students')])
      .then(([threadsData, students]) => {
        setThreads(threadsData)
        // Une famille par lead, dédupliquée (un teacher peut suivre plusieurs
        // enfants de la même famille).
        const byLead = new Map()
        for (const student of students) {
          if (student.familyId && !byLead.has(student.familyId)) {
            byLead.set(student.familyId, { id: student.familyId, name: student.familyName })
          }
        }
        setFamilies([...byLead.values()])
        setSelectedId((current) => current ?? threadsData[0]?.id ?? null)
      })
      .catch((err) => setError(err.message))

  useEffect(() => {
    load()
  }, [])

  const handleSend = (e) => {
    e.preventDefault()
    if (!draft.trim() || !selectedId) return
    setSending(true)
    api
      .post(`/teacher/messages/${selectedId}`, { body: draft })
      .then(() => {
        setDraft('')
        return load()
      })
      .catch((err) => setError(err.message))
      .finally(() => setSending(false))
  }

  const handleSelect = (thread) => {
    setSelectedId(thread.id)
    if (thread.unreadCount > 0) {
      api
        .post(`/teacher/messages/${thread.id}/read`)
        .then(() => Promise.all([load(), refreshUnreadCount()]))
        .catch(() => {})
    }
  }

  const closeNewMessage = () => {
    setShowNewMessage(false)
    setRecipientType('famille')
    setNewThreadLeadId('')
    setAdminForm({ subject: '', message: '' })
  }

  const handleStartFamilyThread = (e) => {
    e.preventDefault()
    if (!newThreadLeadId) return
    setStarting(true)
    setError(null)
    api
      .post('/teacher/messages', { leadId: newThreadLeadId })
      .then((thread) => {
        closeNewMessage()
        setSelectedId(thread.id)
        return load()
      })
      .catch((err) => setError(err.message))
      .finally(() => setStarting(false))
  }

  const handleSendToAdmin = (e) => {
    e.preventDefault()
    setStarting(true)
    setError(null)
    api
      .post('/teacher/support', adminForm)
      .then(() => {
        closeNewMessage()
      })
      .catch((err) => setError(err.message))
      .finally(() => setStarting(false))
  }

  if (error && !threads) return <p className="text-red-600">{error}</p>
  if (!threads || !families) return <Spinner />

  const selected = threads.find((t) => t.id === selectedId)

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold text-navy">Messagerie</h1>
        <Button variant="secondary" icon={SquarePen} onClick={() => setShowNewMessage((v) => !v)}>
          Nouveau message
        </Button>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {showNewMessage && (
        <Card className="mb-6 p-5">
          <div className="mb-3 flex gap-2 text-sm">
            <button
              type="button"
              onClick={() => setRecipientType('famille')}
              className={`rounded-full border px-3 py-1 font-medium transition-colors ${
                recipientType === 'famille'
                  ? 'border-navy bg-navy text-white'
                  : 'border-gray-300 text-gray-600 hover:border-navy/40'
              }`}
            >
              Une famille
            </button>
            <button
              type="button"
              onClick={() => setRecipientType('admin')}
              className={`rounded-full border px-3 py-1 font-medium transition-colors ${
                recipientType === 'admin'
                  ? 'border-navy bg-navy text-white'
                  : 'border-gray-300 text-gray-600 hover:border-navy/40'
              }`}
            >
              L'équipe Nafoore Education
            </button>
          </div>

          {recipientType === 'famille' ? (
            families.length === 0 ? (
              <p className="text-sm text-gray-500">
                Aucune famille suivie pour l'instant — les familles de tes élèves apparaîtront ici.
              </p>
            ) : (
              <form onSubmit={handleStartFamilyThread} className="flex flex-wrap items-end gap-3">
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-medium text-gray-500">
                    Choisir une famille
                  </label>
                  <select
                    required
                    value={newThreadLeadId}
                    onChange={(e) => setNewThreadLeadId(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Choisir…</option>
                    {families.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
                <Button type="submit" disabled={starting}>
                  Démarrer
                </Button>
              </form>
            )
          ) : (
            <form onSubmit={handleSendToAdmin} className="space-y-3">
              <input
                required
                placeholder="Sujet"
                value={adminForm.subject}
                onChange={(e) => setAdminForm((f) => ({ ...f, subject: e.target.value }))}
                className={inputClass}
              />
              <textarea
                required
                rows={3}
                placeholder="Ton message pour l'équipe Nafoore Education…"
                value={adminForm.message}
                onChange={(e) => setAdminForm((f) => ({ ...f, message: e.target.value }))}
                className={`${inputClass} resize-y`}
              />
              <Button type="submit" disabled={starting}>
                Envoyer à l'équipe
              </Button>
              <p className="text-xs text-gray-400">
                Tu retrouveras ce message et la réponse de l'équipe dans l'onglet Support.
              </p>
            </form>
          )}
        </Card>
      )}

      {threads.length === 0 ? (
        <Card className="overflow-hidden">
          <EmptyState
            icon={MessageSquare}
            title="Aucune conversation pour l'instant"
            description="Les échanges avec les familles apparaîtront ici."
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-[220px_1fr]">
          <Card className="overflow-hidden p-0">
            {threads.map((thread) => (
              <button
                key={thread.id}
                onClick={() => handleSelect(thread)}
                className={`flex w-full items-center justify-between border-b border-gray-100 px-4 py-3 text-left text-sm last:border-0 ${
                  thread.id === selectedId ? 'bg-gold-400/10 font-medium text-navy' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {thread.familyName}
                {thread.unreadCount > 0 && (
                  <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-gold-500 px-1 text-[10px] font-bold text-white">
                    {thread.unreadCount}
                  </span>
                )}
              </button>
            ))}
          </Card>

          <Card className="flex flex-col p-5">
            {selected && (
              <>
                <h2 className="mb-3 font-semibold text-gray-900">{selected.familyName}</h2>
                <div className="mb-4 flex-1 space-y-3">
                  {selected.messages.length === 0 ? (
                    <p className="text-sm text-gray-500">Aucun message pour l'instant.</p>
                  ) : (
                    selected.messages.map((message) => (
                      <div
                        key={message.id}
                        className={`max-w-[75%] rounded-xl px-3.5 py-2 text-sm ${
                          message.removedAt
                            ? 'bg-gray-50 text-gray-400 italic'
                            : message.sender === 'teacher'
                              ? 'ml-auto bg-navy text-white'
                              : 'bg-gray-100 text-gray-800'
                        } ${message.sender === 'teacher' && message.removedAt ? 'ml-auto' : ''}`}
                      >
                        <p className="break-words">{message.body}</p>
                        <p
                          className={`mt-1 text-[11px] ${
                            !message.removedAt && message.sender === 'teacher'
                              ? 'text-white/60'
                              : 'text-gray-400'
                          }`}
                        >
                          {formatTime(message.createdAt)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
                <form onSubmit={handleSend} className="flex items-end gap-2">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSend(e)
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
