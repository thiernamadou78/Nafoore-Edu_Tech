import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { api } from '../../lib/api'
import { Alert } from '../../components/ui/Alert'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy'

function ModerateForm({ onCancel, onConfirm, saving }) {
  const [reason, setReason] = useState('')
  const [warn, setWarn] = useState(true)

  return (
    <div className="mt-2 space-y-2 rounded-lg border border-red-100 bg-red-50 p-3">
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
          disabled={saving || !reason.trim()}
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

      <div className="space-y-3">
        {thread.messages.map((message) => (
          <Card key={message.id} className="p-4">
            <div className="mb-1 flex items-center justify-between">
              <Badge tone={message.sender === 'teacher' ? 'blue' : 'green'}>
                {message.sender === 'teacher' ? 'Enseignant' : 'Famille'}
              </Badge>
              <span className="text-xs text-gray-400">
                {new Date(message.createdAt).toLocaleString('fr-FR', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </span>
            </div>
            <p className="text-sm text-gray-800">{message.body}</p>

            {message.removedAt ? (
              <p className="mt-2 text-xs text-red-600">
                Retiré le {new Date(message.removedAt).toLocaleDateString('fr-FR')} par{' '}
                {message.removedBy?.name ?? 'un admin'} — motif : {message.removedReason}
              </p>
            ) : moderatingId === message.id ? (
              <ModerateForm
                saving={saving}
                onCancel={() => setModeratingId(null)}
                onConfirm={(data) => handleModerate(message.id, data)}
              />
            ) : (
              <button
                onClick={() => setModeratingId(message.id)}
                className="mt-2 inline-flex items-center gap-1 text-xs text-red-600 hover:underline"
              >
                <Trash2 size={12} />
                Retirer ce message
              </button>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
