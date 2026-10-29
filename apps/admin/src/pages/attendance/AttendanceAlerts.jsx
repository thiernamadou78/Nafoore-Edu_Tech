import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, CalendarX, FileWarning, RadioTower } from 'lucide-react'
import { api } from '../../lib/api'
import { useAutoRefresh } from '../../lib/useAutoRefresh'
import { formatDateTime } from '../../lib/format'
import { useAuth } from '../../context/AuthContext'
import { Alert } from '../../components/ui/Alert'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import {
  PointagesJournal,
  formatHours,
  periodQuery,
  readPeriod,
  readRange,
  savePeriod,
  saveRange,
  store,
} from './PointagesJournal'
import { CloseOpenAction, NeverPointedActions, RemindButton } from './AttendanceActions'

// Anciennete des anomalies listees.
const ALERT_PERIODS = [
  { key: 30, label: '30 jours' },
  { key: 90, label: '3 mois' },
  { key: 'all', label: 'Tout' },
]
const ALERT_KEY = 'nafoore.pointages.alertDays'

function readAlertDays() {
  try {
    const raw = JSON.parse(localStorage.getItem(ALERT_KEY) ?? '30')
    return ALERT_PERIODS.some((p) => p.key === raw) ? raw : 30
  } catch {
    return 30
  }
}

function timeRangeLabel(date, durationMinutes) {
  if (!date) return '—'
  const start = new Date(date)
  const end = new Date(start.getTime() + (durationMinutes ?? 0) * 60000)
  const startLabel = formatDateTime(start)
  const endLabel = end.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  return `${startLabel} – ${endLabel}`
}

// Indicateurs de la semaine et du mois en cours.
function StatsCards({ stats }) {
  if (!stats) return null
  const cards = [
    { label: 'Heures pointées cette semaine', value: formatHours(stats.weekMinutes) },
    { label: 'Heures pointées ce mois', value: formatHours(stats.monthMinutes) },
    {
      label: 'Pointages par scan QR (mois)',
      value: stats.qrShare === null ? '—' : `${stats.qrShare} %`,
    },
    {
      label: `Arrivées en retard (mois, + de ${stats.lateThresholdMinutes} min)`,
      value: stats.lateCount,
      alert: stats.lateCount > 0,
    },
    { label: 'Comptes-rendus en attente', value: stats.pendingReports, alert: stats.pendingReports > 0 },
  ]
  return (
    <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((card) => (
        <Card key={card.label} className="p-4">
          <p className={`text-xl font-bold tabular-nums ${card.alert ? 'text-amber-600' : 'text-navy'}`}>{card.value}</p>
          <p className="mt-0.5 text-xs text-gray-500">{card.label}</p>
        </Card>
      ))}
    </div>
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
  const { can, isSuperAdmin } = useAuth()
  const canEdit = can('attendance', 'edit')
  const [data, setData] = useState(null)
  const [stats, setStats] = useState(null)
  const [error, setError] = useState(null)
  const [period, setPeriod] = useState(readPeriod)
  const [range, setRange] = useState(readRange)
  const [alertDays, setAlertDays] = useState(readAlertDays)
  const [loading, setLoading] = useState(false)
  // Erreur liee a la periode (ex. intervalle invalide) : affichee sans
  // masquer la page.
  const [rangeError, setRangeError] = useState(null)

  const fetchData = useCallback(() => {
    try {
      return api.get(`/dashboard/attendance-alerts?${periodQuery(period, range)}&alertDays=${alertDays}`)
    } catch (err) {
      return Promise.reject(err)
    }
  }, [period, range, alertDays])

  const refresh = useCallback(async () => {
    const [result, statsResult] = await Promise.all([fetchData(), api.get('/admin/attendance/stats').catch(() => null)])
    setData(result)
    if (statsResult) setStats(statsResult)
    setRangeError(null)
  }, [fetchData])

  useEffect(() => {
    setLoading(true)
    refresh()
      .then(() => setError(null))
      .catch((err) => (data ? setRangeError(err.message) : setError(err.message)))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh])

  useAutoRefresh(() => {
    refresh().catch(() => {})
  })

  const changePeriod = (value) => {
    setPeriod(value)
    setRangeError(null)
    savePeriod(value)
  }
  const changeRange = (value) => {
    setRange(value)
    setRangeError(null)
    saveRange(value)
  }
  const changeAlertDays = (value) => {
    setAlertDays(value)
    store(ALERT_KEY, value)
  }

  if (error) return <Alert>{error}</Alert>
  if (!data) return <p className="text-gray-500">Chargement…</p>

  const { staleOpenSessions, neverPointedSessions, missingReports, recentPointages = [] } = data
  const total = staleOpenSessions.length + neverPointedSessions.length + missingReports.length

  return (
    <div>
      <div className="mb-5 flex items-baseline gap-2">
        <h1 className="text-xl font-semibold text-gray-900">Suivi des pointages</h1>
        <span className="text-sm text-gray-400">{total} à surveiller</span>
      </div>

      <StatsCards stats={stats} />

      <div className="mb-5">
        {rangeError && <Alert className="mb-3">{rangeError}</Alert>}
        <PointagesJournal
          items={recentPointages}
          period={period}
          onPeriodChange={changePeriod}
          range={range}
          onRangeChange={changeRange}
          loading={loading}
          canEdit={canEdit}
          canExport={isSuperAdmin}
          onChanged={refresh}
        />
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-gray-900">Anomalies à traiter</h2>
        <div className="inline-flex rounded-full bg-gray-100 p-1 text-xs" role="group" aria-label="Ancienneté des anomalies">
          {ALERT_PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              aria-pressed={alertDays === p.key}
              onClick={() => changeAlertDays(p.key)}
              className={`rounded-full px-3 py-1.5 font-medium transition-colors ${
                alertDays === p.key ? 'bg-white text-navy shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
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
            description="Arrivée pointée, mais jamais le départ : le prof a probablement oublié de pointer la fin."
            items={staleOpenSessions}
            emptyLabel="Aucune séance bloquée en cours."
            renderItem={(item) => (
              <li key={item.attendanceLogId} className="py-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <Link to={`/eleves/${item.student.id}`} className="font-medium text-navy hover:underline">
                      {item.student.name}
                    </Link>
                    <p className="text-xs text-gray-500">
                      {item.teacher.name}
                      {item.subject ? ` · ${item.subject}` : ''} — prévue{' '}
                      {timeRangeLabel(item.scheduledDate, item.durationMinutes)}
                    </p>
                  </div>
                  <Badge tone="amber">Arrivée {formatDateTime(item.checkinAt)}</Badge>
                </div>
                {canEdit && (
                  <div className="mt-1.5 flex flex-wrap items-center gap-3">
                    <CloseOpenAction
                      logId={item.attendanceLogId}
                      scheduledDate={item.scheduledDate}
                      durationMinutes={item.durationMinutes}
                      onDone={refresh}
                    />
                    {item.sessionId && <RemindButton sessionId={item.sessionId} kind="pointage" />}
                  </div>
                )}
              </li>
            )}
          />

          <AlertSection
            icon={CalendarX}
            tone="text-red-500"
            title="Séances passées jamais pointées"
            description="Ni scan QR, ni pointage manuel : la séance a-t-elle eu lieu ?"
            items={neverPointedSessions}
            emptyLabel="Aucune séance oubliée."
            renderItem={(session) => (
              <li key={session.id} className="py-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <Link to={`/eleves/${session.student.id}`} className="font-medium text-navy hover:underline">
                      {session.student.name}
                    </Link>
                    <p className="text-xs text-gray-500">
                      {session.teacher?.name ?? 'Prof inconnu'}
                      {session.subject ? ` · ${session.subject}` : ''}
                    </p>
                  </div>
                  <span className="text-xs text-gray-500">{timeRangeLabel(session.date, session.durationMinutes)}</span>
                </div>
                {canEdit && session.teacher && (
                  <div className="mt-1.5">
                    <NeverPointedActions
                      sessionId={session.id}
                      scheduledDate={session.date}
                      durationMinutes={session.durationMinutes}
                      onDone={refresh}
                    />
                  </div>
                )}
              </li>
            )}
          />

          <AlertSection
            icon={FileWarning}
            tone="text-sky-500"
            title="Comptes-rendus manquants"
            description="Séance pointée, mais le compte-rendu n'a pas été rédigé."
            items={missingReports}
            emptyLabel="Tous les comptes-rendus sont renseignés."
            renderItem={(session) => (
              <li key={session.id} className="py-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <Link to={`/eleves/${session.student.id}`} className="font-medium text-navy hover:underline">
                      {session.student.name}
                    </Link>
                    <p className="text-xs text-gray-500">
                      {session.teacher?.name ?? 'Prof inconnu'}
                      {session.subject ? ` · ${session.subject}` : ''}
                    </p>
                  </div>
                  <span className="text-xs text-gray-500">{timeRangeLabel(session.date, session.durationMinutes)}</span>
                </div>
                {canEdit && session.teacher && (
                  <div className="mt-1.5">
                    <RemindButton sessionId={session.id} kind="compte_rendu" />
                  </div>
                )}
              </li>
            )}
          />
        </div>
      )}
    </div>
  )
}
