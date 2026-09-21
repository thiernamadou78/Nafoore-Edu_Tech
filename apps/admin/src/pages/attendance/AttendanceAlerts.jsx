import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, CalendarX, FileWarning, RadioTower } from 'lucide-react'
import { api } from '../../lib/api'
import { useAutoRefresh } from '../../lib/useAutoRefresh'
import { formatDateTime } from '../../lib/format'
import { Alert } from '../../components/ui/Alert'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'

function timeRangeLabel(date, durationMinutes) {
  if (!date) return '—'
  const start = new Date(date)
  const end = new Date(start.getTime() + (durationMinutes ?? 0) * 60000)
  const startLabel = formatDateTime(start)
  const endLabel = end.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  return `${startLabel} – ${endLabel}`
}

function AlertSection({ icon: Icon, tone, title, description, items, renderItem, emptyLabel }) {
  return (
    <Card className="p-5">
      <div className="mb-1 flex items-center gap-2">
        <Icon size={18} className={tone} />
        <h2 className="font-semibold text-gray-900">{title}</h2>
        <Badge tone={items.length > 0 ? 'red' : 'gray'}>{items.length}</Badge>
      </div>
      <p className="mb-4 text-sm text-gray-500">{description}</p>
      {items.length === 0 ? (
        <p className="py-4 text-center text-sm text-gray-400">{emptyLabel}</p>
      ) : (
        <ul className="divide-y divide-gray-100">{items.map(renderItem)}</ul>
      )}
    </Card>
  )
}

export function AttendanceAlerts() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.get('/dashboard/attendance-alerts').then(setData).catch((err) => setError(err.message))
  }, [])

  useAutoRefresh(() => {
    api.get('/dashboard/attendance-alerts').then(setData).catch(() => {})
  })

  if (error) return <Alert>{error}</Alert>
  if (!data) return <p className="text-gray-500">Chargement…</p>

  const { staleOpenSessions, neverPointedSessions, missingReports } = data
  const total = staleOpenSessions.length + neverPointedSessions.length + missingReports.length

  return (
    <div>
      <div className="mb-6 flex items-baseline gap-2">
        <h1 className="text-xl font-semibold text-gray-900">Suivi des pointages</h1>
        <span className="text-sm text-gray-400">{total} à surveiller</span>
      </div>

      {total === 0 ? (
        <Card className="p-8">
          <EmptyState
            icon={RadioTower}
            title="Rien à signaler"
            description="Aucune séance en souffrance : tous les pointages et comptes-rendus sont à jour."
          />
        </Card>
      ) : (
        <div className="space-y-5">
          <AlertSection
            icon={AlertTriangle}
            tone="text-amber-500"
            title="Séances restées « en cours »"
            description="Check-in scanné, mais jamais de check-out — le prof a probablement oublié de pointer la fin."
            items={staleOpenSessions}
            emptyLabel="Aucune séance bloquée en cours."
            renderItem={(item) => (
              <li key={item.attendanceLogId} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div>
                  <Link to={`/eleves/${item.student.id}`} className="font-medium text-navy hover:underline">
                    {item.student.name}
                  </Link>
                  <p className="text-xs text-gray-500">
                    {item.teacher.name}
                    {item.subject ? ` · ${item.subject}` : ''} — prévue {timeRangeLabel(item.scheduledDate, null)}
                  </p>
                </div>
                <Badge tone="amber">Check-in {formatDateTime(item.checkinAt)}</Badge>
              </li>
            )}
          />

          <AlertSection
            icon={CalendarX}
            tone="text-red-500"
            title="Séances passées jamais pointées"
            description="Ni scan QR, ni pointage manuel n'a eu lieu pour ces séances déjà passées."
            items={neverPointedSessions}
            emptyLabel="Aucune séance oubliée."
            renderItem={(session) => (
              <li key={session.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div>
                  <Link to={`/eleves/${session.student.id}`} className="font-medium text-navy hover:underline">
                    {session.student.name}
                  </Link>
                  <p className="text-xs text-gray-500">
                    {session.teacher?.name ?? 'Prof inconnu'}
                    {session.subject ? ` · ${session.subject}` : ''}
                  </p>
                </div>
                <span className="text-xs text-gray-500">
                  {timeRangeLabel(session.date, session.durationMinutes)}
                </span>
              </li>
            )}
          />

          <AlertSection
            icon={FileWarning}
            tone="text-sky-500"
            title="Comptes-rendus manquants"
            description="Séance pointée réalisée, mais aucune note pédagogique n'a été renseignée."
            items={missingReports}
            emptyLabel="Tous les comptes-rendus sont renseignés."
            renderItem={(session) => (
              <li key={session.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div>
                  <Link to={`/eleves/${session.student.id}`} className="font-medium text-navy hover:underline">
                    {session.student.name}
                  </Link>
                  <p className="text-xs text-gray-500">
                    {session.teacher?.name ?? 'Prof inconnu'}
                    {session.subject ? ` · ${session.subject}` : ''}
                  </p>
                </div>
                <span className="text-xs text-gray-500">
                  {timeRangeLabel(session.date, session.durationMinutes)}
                </span>
              </li>
            )}
          />
        </div>
      )}
    </div>
  )
}
