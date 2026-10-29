import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, CalendarX, FileWarning, RadioTower } from 'lucide-react'
import { api } from '../../lib/api'
import { useAutoRefresh } from '../../lib/useAutoRefresh'
import { formatDateTime } from '../../lib/format'
import { Alert } from '../../components/ui/Alert'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { PaginationControls } from '../../components/ui/PaginationControls'
import { usePagination } from '../../lib/usePagination'

// Periodes du journal des pointages (en jours).
const PERIODS = [
  { days: 1, label: '24 h' },
  { days: 3, label: '3 jours' },
  { days: 7, label: '7 jours' },
  { days: 30, label: '1 mois' },
  { days: 90, label: '3 mois' },
]
const PERIOD_KEY = 'nafoore.pointages.period'

function readPeriod() {
  try {
    const saved = Number(localStorage.getItem(PERIOD_KEY))
    return PERIODS.some((p) => p.days === saved) ? saved : 7
  } catch {
    return 7
  }
}

function formatHours(minutes) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} min`
  return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`
}

function timeRangeLabel(date, durationMinutes) {
  if (!date) return '—'
  const start = new Date(date)
  const end = new Date(start.getTime() + (durationMinutes ?? 0) * 60000)
  const startLabel = formatDateTime(start)
  const endLabel = end.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  return `${startLabel} – ${endLabel}`
}

const timeOf = (date) =>
  new Date(date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

// Journal des pointages de la periode choisie : arrivee, depart, duree reelle
// et etat du compte-rendu, avec un resume (nombre, heures, part du scan QR).
function RecentPointages({ items, days, onDaysChange, loading }) {
  const page = usePagination(items, 20)
  const minutesOf = (item) =>
    item.checkoutAt && item.checkinAt
      ? Math.max(0, Math.round((new Date(item.checkoutAt) - new Date(item.checkinAt)) / 60000))
      : 0
  const closed = items.filter((item) => item.checkoutAt)
  const totalMinutes = closed.reduce((sum, item) => sum + minutesOf(item), 0)
  const qrShare = items.length ? Math.round((items.filter((i) => i.method === 'qr_scan').length / items.length) * 100) : null
  const periodLabel = PERIODS.find((p) => p.days === days)?.label ?? `${days} jours`

  return (
    <Card className="p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <RadioTower size={18} className="text-navy" />
          <h2 className="font-semibold text-gray-900">Pointages</h2>
          <Badge tone="gray">{items.length}</Badge>
        </div>
        <div className="inline-flex flex-wrap rounded-full bg-gray-100 p-1 text-xs" role="group" aria-label="Période">
          {PERIODS.map((p) => (
            <button
              key={p.days}
              type="button"
              aria-pressed={days === p.days}
              onClick={() => onDaysChange(p.days)}
              className={`rounded-full px-3 py-1.5 font-medium transition-colors ${
                days === p.days ? 'bg-white text-navy shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-navy/5 px-3 py-1 font-medium text-navy">
          {items.length} pointage{items.length > 1 ? 's' : ''} · {periodLabel}
        </span>
        <span className="rounded-full bg-green-50 px-3 py-1 text-green-700">{formatHours(totalMinutes)} pointées</span>
        {items.length - closed.length > 0 && (
          <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-800">
            {items.length - closed.length} en cours
          </span>
        )}
        {qrShare !== null && (
          <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-600">{qrShare} % par scan QR</span>
        )}
        {loading && <span className="px-1 py-1 text-gray-400">Chargement…</span>}
      </div>

      {items.length === 0 ? (
        <p className="py-4 text-center text-sm text-gray-400">Aucun pointage sur cette période.</p>
      ) : (
        <>
          <ul className="divide-y divide-gray-100">
            {page.visible.map((item) => {
              const minutes = minutesOf(item)
              return (
                <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                  <div>
                    <Link to={`/eleves/${item.student.id}`} className="font-medium text-navy hover:underline">
                      {item.student.name}
                    </Link>
                    <p className="text-xs text-gray-500">
                      {item.teacher.name}
                      {item.subject ? ` · ${item.subject}` : ''} —{' '}
                      {item.scheduledDate ? formatDateTime(item.scheduledDate) : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="green">
                      {timeOf(item.checkinAt)} →{' '}
                      {item.checkoutAt ? timeOf(item.checkoutAt) : 'en cours'}
                      {minutes > 0 ? ` (${minutes} min)` : ''}
                    </Badge>
                    <Badge tone="gray">{item.method === 'qr_scan' ? 'Scan QR' : 'Manuel'}</Badge>
                    {item.checkoutAt && (
                      <Badge tone={item.hasReport ? 'green' : 'amber'}>
                        {item.hasReport ? 'Compte-rendu rédigé' : 'Compte-rendu à rédiger'}
                      </Badge>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
          <PaginationControls {...page} onShowMore={page.showMore} onCollapse={page.collapse} className="pt-2" />
        </>
      )}
    </Card>
  )
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
  const [days, setDays] = useState(readPeriod)
  const [loading, setLoading] = useState(false)

  const fetchData = useCallback(() => api.get(`/dashboard/attendance-alerts?days=${days}`), [days])

  useEffect(() => {
    setLoading(true)
    fetchData()
      .then((result) => {
        setData(result)
        setError(null)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [fetchData])

  useAutoRefresh(() => {
    fetchData().then(setData).catch(() => {})
  })

  const changePeriod = (value) => {
    setDays(value)
    try {
      localStorage.setItem(PERIOD_KEY, String(value))
    } catch {
      // stockage indisponible : la periode n'est simplement pas memorisee
    }
  }

  if (error) return <Alert>{error}</Alert>
  if (!data) return <p className="text-gray-500">Chargement…</p>

  const { staleOpenSessions, neverPointedSessions, missingReports, recentPointages = [] } = data
  const total = staleOpenSessions.length + neverPointedSessions.length + missingReports.length

  return (
    <div>
      <div className="mb-6 flex items-baseline gap-2">
        <h1 className="text-xl font-semibold text-gray-900">Suivi des pointages</h1>
        <span className="text-sm text-gray-400">{total} à surveiller</span>
      </div>

      <div className="mb-5">
        <RecentPointages items={recentPointages} days={days} onDaysChange={changePeriod} loading={loading} />
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
