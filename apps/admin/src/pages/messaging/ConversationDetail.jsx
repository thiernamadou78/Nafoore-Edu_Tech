import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { api } from '../../lib/api'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy'

function ModerateForm({ onCancel, onConfirm, saving }) {
  const [reason, setReason] = useState('')
  const [warn, setWarn] = useState(true)

  return (
    <div className="mt-2 space-y-2 rounded-lg border border-red-200 bg-white p-3 text-left">
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={2}
        placeholder="Motif du retrait…"
        className={`${inputClass} resize-none`}
      />
      <label className="flex items-center gap-2 text-xs text-gray-600">
        <input
          type="checkbox"
          checked={warn}
          onChange={(e) => setWarn(e.target.checked)}
          className="h-3.5 w-3.5 rounded border-gray-300 text-navy focus:ring-navy"
        />
        Avertir l'expéditeur par email
      </label>
      <div className="flex gap-2">
        <Button
          variant="danger"
          loading={saving}
          disabled={!reason.trim()}
          onClick={() => onConfirm({ reason, warn })}
        >
          Confirmer le retrait
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          Annuler
        </Button>
      </div>
    </div>
  )
}

function formatTime(date) {
  return new Date(date).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
}

export function ConversationDetail() {
  const { id } = useParams()
  const [thread, setThread] = useState(null)
  const [error, setError] = useState(null)
  const [moderatingId, setModeratingId] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = () =>
    api
      .get(`/admin/message-threads/${id}`)
      .then(setThread)
      .catch((err) => setError(err.message))

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const handleModerate = (messageId, { reason, warn }) => {
    setSaving(true)
    api
      .post(`/admin/message-threads/messages/${messageId}/moderate`, { reason, warn })
      .then(() => {
        setModeratingId(null)
        return load()
      })
      .catch((err) => setError(err.message))
      .finally(() => setSaving(false))
  }

  if (!thread) {
    return error ? <Alert>{error}</Alert> : <p className="text-gray-500">Chargement…</p>
  }

  return (
    <div className="max-w-2xl">
      <Link
        to="/conversations"
        className="mb-4 inline-flex items-center gap-1 text-sm text-navy hover:underline"
      >
        <ArrowLeft size={14} />
        Retour aux conversations
      </Link>

      <h1 className="mb-1 text-xl font-semibold text-gray-900">
        {thread.teacherName} ↔ {thread.familyLeadName ?? thread.familyName}
      </h1>
      <p className="mb-6 text-sm text-gray-500">{thread.messages.length} message(s)</p>

      {error && <Alert>{error}</Alert>}

      <Card className="p-5">
        <div className="space-y-4">
          {thread.messages.map((message) => {
            const isFamily = message.sender !== 'teacher'
            const senderName = isFamily
              ? (thread.familyLeadName ?? thread.familyName)
              : thread.teacherName
            return (
              <div key={message.id} className={`flex flex-col ${isFamily ? 'items-end' : 'items-start'}`}>
                <p className="mb-1 px-1 text-xs font-medium text-gray-400">{senderName}</p>
                <div
                  className={`max-w-[75%] rounded-xl px-3.5 py-2 text-sm ${
                    message.removedAt
                      ? 'bg-gray-50 text-gray-400 italic'
                      : isFamily
                        ? 'bg-navy text-white'
                        : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.body}</p>
                  <p
                    className={`mt-1 text-[11px] ${
                      !message.removedAt && isFamily ? 'text-white/60' : 'text-gray-400'
                    }`}
                  >
                    {formatTime(message.createdAt)}
                  </p>
                </div>

                {message.removedAt ? (
                  <p className="mt-1 max-w-[75%] px-1 text-xs text-red-600">
                    Retiré le {new Date(message.removedAt).toLocaleDateString('fr-FR')} par{' '}
                    {message.removedBy?.name ?? 'un admin'} — motif : {message.removedReason}
                  </p>
                ) : moderatingId === message.id ? (
                  <div className="mt-1 w-full max-w-[75%]">
                    <ModerateForm
                      saving={saving}
                      onCancel={() => setModeratingId(null)}
                      onConfirm={(data) => handleModerate(message.id, data)}
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => setModeratingId(message.id)}
                    className="mt-1 inline-flex items-center gap-1 px-1 text-xs text-red-600 hover:underline"
                  >
                    <Trash2 size={12} />
                    Retirer ce message
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
