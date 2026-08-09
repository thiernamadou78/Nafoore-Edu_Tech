import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Send, SquarePen } from 'lucide-react'
import { api } from '../lib/api'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Spinner } from '../components/ui/Spinner'

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy'

function formatTime(date) {
  return new Date(date).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
}

export function Messagerie() {
  const { refreshUnreadCount } = useOutletContext()
  const [threads, setThreads] = useState(null)
  const [teachers, setTeachers] = useState(null)
  const [error, setError] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [showNewThread, setShowNewThread] = useState(false)
  const [newThreadTeacherId, setNewThreadTeacherId] = useState('')
  const [starting, setStarting] = useState(false)

  const load = () =>
    Promise.all([api.get('/family/messages'), api.get('/family/teachers')])
      .then(([threadsData, teachersData]) => {
        setThreads(threadsData)
        setTeachers(teachersData)
        setSelectedId((current) => current ?? threadsData[0]?.id ?? null)
      })
      .catch((err) => setError(err.message))

  useEffect(() => {
    load()
  }, [])

  const handleSelect = (thread) => {
    setSelectedId(thread.id)
    if (thread.unreadCount > 0) {
      api
        .post(`/family/messages/${thread.id}/read`)
        .then(() => Promise.all([load(), refreshUnreadCount()]))
        .catch(() => {})
    }
  }

  const handleSend = (e) => {
    e.preventDefault()
    if (!draft.trim() || !selectedId) return
    setSending(true)
    api
      .post(`/family/messages/${selectedId}`, { body: draft })
      .then(() => {
        setDraft('')
        return load()
      })
      .catch((err) => setError(err.message))
      .finally(() => setSending(false))
  }

  const handleStartThread = (e) => {
    e.preventDefault()
    if (!newThreadTeacherId) return
    setStarting(true)
    api
      .post('/family/messages', { teacherId: newThreadTeacherId })
      .then((thread) => {
        setShowNewThread(false)
        setNewThreadTeacherId('')
        setSelectedId(thread.id)
        return load()
      })
      .catch((err) => setError(err.message))
      .finally(() => setStarting(false))
  }

  if (error) return <p className="text-red-600">{error}</p>
  if (!threads || !teachers) return <Spinner />

  const selected = threads.find((t) => t.id === selectedId)

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold text-navy">Messagerie</h1>
        {teachers.length > 0 && (
          <Button
            variant="secondary"
            icon={SquarePen}
            onClick={() => setShowNewThread((v) => !v)}
          >
            Nouvelle conversation
          </Button>
        )}
      </div>

      {showNewThread && (
        <Card className="mb-6 p-5">
          <form onSubmit={handleStartThread} className="flex flex-wrap items-end gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-gray-500">
                Choisir un enseignant
              </label>
              <select
                required
                value={newThreadTeacherId}
                onChange={(e) => setNewThreadTeacherId(e.target.value)}
                className={inputClass}
              >
                <option value="">Choisir…</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" disabled={starting}>
              Démarrer
            </Button>
          </form>
        </Card>
      )}

      {threads.length === 0 ? (
        <Card className="p-8 text-center text-sm text-gray-500">
          Aucune conversation pour l'instant.
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-[220px_1fr]">
          <Card className="overflow-hidden p-0">
            {threads.map((thread) => (
              <button
                key={thread.id}
                onClick={() => handleSelect(thread)}
                className={`flex w-full items-center justify-between border-b border-gray-100 px-4 py-3 text-left text-sm last:border-0 ${
                  thread.id === selectedId
                    ? 'bg-gold-400/10 font-medium text-navy'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {thread.teacherName}
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
                <h2 className="mb-3 font-semibold text-gray-900">{selected.teacherName}</h2>
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
                            : message.sender === 'famille'
                              ? 'ml-auto bg-navy text-white'
                              : 'bg-gray-100 text-gray-800'
                        } ${message.sender === 'famille' && message.removedAt ? 'ml-auto' : ''}`}
                      >
                        <p>{message.body}</p>
                        <p
                          className={`mt-1 text-[11px] ${
                            !message.removedAt && message.sender === 'famille'
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
                <form onSubmit={handleSend} className="flex gap-2">
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Écrire un message…"
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
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
