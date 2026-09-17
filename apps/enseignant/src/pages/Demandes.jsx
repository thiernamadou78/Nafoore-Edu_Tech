import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Sparkles } from 'lucide-react'
import { api } from '../lib/api'
import { formatDate } from '../lib/format'
import { Alert } from '../components/ui/Alert'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { Spinner } from '../components/ui/Spinner'

const FORMAT_LABELS = {
  presentiel: 'Présentiel',
  distanciel: 'Distanciel',
  hybride: 'Hybride',
}

const LEVEL_LABELS = {
  primaire: 'Primaire',
  college: 'Collège',
  lycee: 'Lycée',
}

function RequestCard({ request, onToggleInterest, saving }) {
  return (
    <Card className="p-5">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Badge tone="gold">{request.subject}</Badge>
        {request.student?.level && (
          <Badge tone="gray">{LEVEL_LABELS[request.student.level] ?? request.student.level}</Badge>
        )}
        <Badge tone="blue">{FORMAT_LABELS[request.format] ?? request.format}</Badge>
      </div>
      <p className="text-sm text-gray-700">{request.frequency}</p>
      {request.durationMinutes && (
        <p className="text-sm text-gray-500">Durée souhaitée : {request.durationMinutes} min</p>
      )}
      {request.availability && (
        <p className="mt-1 text-sm text-gray-500">Disponibilités : {request.availability}</p>
      )}
      <p className="mt-2 text-xs text-gray-400">Demande du {formatDate(request.createdAt)}</p>

      <div className="mt-4">
        {request.interested ? (
          <Button
            variant="secondary"
            icon={Check}
            loading={saving}
            onClick={() => onToggleInterest(request.id, false)}
          >
            Intéressé — annuler
          </Button>
        ) : (
          <Button icon={Sparkles} loading={saving} onClick={() => onToggleInterest(request.id, true)}>
            Je suis intéressé
          </Button>
        )}
      </div>
    </Card>
  )
}

export function Demandes() {
  const [requests, setRequests] = useState(null)
  const [error, setError] = useState(null)
  const [savingId, setSavingId] = useState(null)

  const load = () => api.get('/teacher/open-requests').then(setRequests)

  useEffect(() => {
    load().catch((err) => setError(err.message))
  }, [])

  const toggleInterest = async (requestId, interested) => {
    setSavingId(requestId)
    setError(null)
    try {
      if (interested) {
        await api.post(`/teacher/open-requests/${requestId}/interest`, {})
      } else {
        await api.del(`/teacher/open-requests/${requestId}/interest`)
      }
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingId(null)
    }
  }

  if (error && !requests) return <Alert>{error}</Alert>
  if (!requests) return <Spinner />

  return (
    <div>
      <h1 className="mb-1 font-serif text-2xl font-bold text-navy">Demandes</h1>
      <p className="mb-6 text-sm text-gray-500">
        Demandes de familles correspondant à tes matières (
        <Link to="/profil" className="text-navy underline">
          modifier mes matières
        </Link>
        ). Signale-toi intéressé pour aider l'équipe Nafoore à te proposer plus facilement.
      </p>

      {error && <Alert>{error}</Alert>}

      {requests.length === 0 ? (
        <Card className="p-8">
          <EmptyState
            icon={Sparkles}
            title="Aucune demande pour l'instant"
            description="Aucune demande ouverte ne correspond actuellement à tes matières."
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {requests.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              saving={savingId === request.id}
              onToggleInterest={toggleInterest}
            />
          ))}
        </div>
      )}
    </div>
  )
}
