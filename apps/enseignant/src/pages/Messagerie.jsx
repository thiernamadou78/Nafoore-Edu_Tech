import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Send } from 'lucide-react'
import { api } from '../lib/api'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Spinner } from '../components/ui/Spinner'

function formatTime(date) {
  return new Date(date).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
}

export function Messagerie() {
  const { refreshUnreadCount } = useOutletContext()
  const [threads, setThreads] = useState(null)
  const [error, setError] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)

  const load = () =>
    api
      .get('/teacher/messages')
      .then((data) => {
        setThreads(data)
        setSelectedId((current) => current ?? data[0]?.id ?? null)
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

  if (error) return <p className="text-red-600">{error}</p>
  if (!threads) return <Spinner />

  const selected = threads.find((t) => t.id === selectedId)

  if (threads.length === 0) {
    return (
      <div>
        <h1 className="mb-6 font-serif text-2xl font-bold text-navy">Messagerie</h1>
        <Card className="p-8 text-center text-sm text-gray-500">
          Aucune conversation pour l'instant.
        </Card>
      </div>
    )
  }

  return (
    <div>
      <h1 className="mb-6 font-serif text-2xl font-bold text-navy">Messagerie</h1>
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
                      <p>{message.body}</p>
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
    </div>
  )
}
