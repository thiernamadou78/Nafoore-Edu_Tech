import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Clock } from 'lucide-react'
import { api } from '../lib/api'
import { useAutoRefresh } from '../lib/useAutoRefresh'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { Spinner } from '../components/ui/Spinner'

function getInitials(name) {
  return (name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
}

// Format lisible ("1 h 30 min") plutot que des minutes ou des decimales.
function formatDuration(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = Math.round(totalMinutes % 60)
  if (hours === 0) return `${minutes} min`
  if (minutes === 0) return `${hours} h`
  return `${hours} h ${String(minutes).padStart(2, '0')} min`
}

export function Heures() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  const load = () =>
    api
      .get('/family/hours')
      .then(setData)
      .catch((err) => setError(err.message))

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useAutoRefresh(() => {
    api.get('/family/hours').then(setData).catch(() => {})
  })

  if (error) return <p className="text-red-600">{error}</p>
  if (!data) return <Spinner />

  return (
    <div>
      <div className="mb-6 flex items-center gap-2">
        <Clock size={20} className="text-gold-500" />
        <h1 className="font-serif text-2xl font-bold text-navy">Heures de cours</h1>
      </div>

      <Card className="mb-6 p-5">
        <p className="text-xs text-gray-500">Total pour tous les enfants</p>
        <p className="mt-1 text-3xl font-bold text-navy">{formatDuration(data.totalMinutes)}</p>
        <p className="mt-1 text-xs text-gray-400">
          Séances réalisées et pointées (arrivée + départ enregistrés).
        </p>
      </Card>

      {data.children.length === 0 ? (
        <Card className="p-8">
          <EmptyState
            icon={Clock}
            title="Aucune séance réalisée pour l'instant"
            description="Les heures apparaîtront ici dès qu'une séance aura été pointée du début à la fin."
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {data.children.map((child) => (
            <Card key={child.id} className="p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <Link to={`/eleves/${child.id}`} className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-navy font-medium text-gold-400">
                    {child.photoUrl ? (
                      <img src={child.photoUrl} alt={child.name} className="h-full w-full object-cover" />
                    ) : (
                      getInitials(child.name)
                    )}
                  </span>
                  <span className="font-semibold text-gray-900 hover:underline">{child.name}</span>
                </Link>
                <span className="text-lg font-bold text-navy">{formatDuration(child.totalMinutes)}</span>
              </div>
              {child.bySubject.length > 0 && (
                <ul className="space-y-1 border-t border-gray-100 pt-3 text-sm">
                  {child.bySubject
                    .slice()
                    .sort((a, b) => b.minutes - a.minutes)
                    .map((row) => (
                      <li key={row.subject} className="flex items-center justify-between text-gray-600">
                        <span>{row.subject}</span>
                        <span className="font-medium text-gray-800">{formatDuration(row.minutes)}</span>
                      </li>
                    ))}
                </ul>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
