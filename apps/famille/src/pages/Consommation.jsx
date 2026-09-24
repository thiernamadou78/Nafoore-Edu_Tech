import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, CalendarDays, CheckCircle2, Clock, FileText, Hourglass, QrCode, UserCheck } from 'lucide-react'
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

// Format lisible ("1 h 30") plutot que des minutes ou des decimales.
function formatDuration(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = Math.round(totalMinutes % 60)
  if (hours === 0) return `${minutes} min`
  if (minutes === 0) return `${hours} h`
  return `${hours} h ${String(minutes).padStart(2, '0')}`
}

const monthKey = (date) => {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(key, options = { month: 'long', year: 'numeric' }) {
  const [year, month] = key.split('-').map(Number)
  const label = new Date(year, month - 1, 1).toLocaleDateString('fr-FR', options)
  return label.charAt(0).toUpperCase() + label.slice(1)
}

const sumMinutes = (rows) => rows.reduce((sum, r) => sum + r.minutes, 0)

// Une ligne par matiere (avec le ou les enseignants qui l'ont donnee).
function groupBySubject(rows) {
  const groups = new Map()
  for (const row of rows) {
    const group = groups.get(row.subject) ?? { subject: row.subject, minutes: 0, count: 0, teachers: new Set() }
    group.minutes += row.minutes
    group.count += 1
    group.teachers.add(row.teacherName)
    groups.set(row.subject, group)
  }
  return [...groups.values()].sort((a, b) => b.minutes - a.minutes)
}

function StatTile({ icon: Icon, label, value, hint }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-gray-400">
        <Icon size={14} className="text-gold-500" />
        {label}
      </div>
      <p className="font-serif text-2xl font-bold text-navy">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-gray-400">{hint}</p>}
    </div>
  )
}

function ChildCard({ child, rows }) {
  const total = sumMinutes(rows)
  const subjects = groupBySubject(rows)

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center justify-between gap-4 bg-gradient-to-r from-navy to-navy/90 px-5 py-4 text-white">
        <Link to={`/eleves/${child.id}`} className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10 font-semibold text-gold-400 ring-2 ring-gold-400/60">
            {child.photoUrl ? (
              <img src={child.photoUrl} alt={child.name} className="h-full w-full object-cover" />
            ) : (
              getInitials(child.name)
            )}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-semibold hover:underline">{child.name}</span>
            <span className="block text-xs text-white/60">
              {rows.length} séance{rows.length > 1 ? 's' : ''}
            </span>
          </span>
        </Link>
        <div className="text-right">
          <p className="font-serif text-2xl font-bold text-gold-400">{formatDuration(total)}</p>
          <p className="text-xs text-white/60">de cours</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="px-5 py-6 text-center text-sm text-gray-400">Aucune séance sur cette période.</p>
      ) : (
        <div className="px-5 py-4">
          <ul className="space-y-3">
            {subjects.map((group) => {
              const share = total > 0 ? Math.round((group.minutes / total) * 100) : 0
              return (
                <li key={group.subject}>
                  <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                    <span className="min-w-0">
                      <span className="font-medium text-gray-900">{group.subject}</span>
                      <span className="ml-2 text-xs text-gray-400">
                        {[...group.teachers].join(', ')}
                      </span>
                    </span>
                    <span className="shrink-0 font-semibold text-navy">
                      {formatDuration(group.minutes)}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-gold-400 to-gold-500"
                      style={{ width: `${Math.max(share, 3)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-400">
                    {group.count} séance{group.count > 1 ? 's' : ''} · {share} % du temps
                  </p>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </Card>
  )
}

const formatTime = (value) =>
  value ? new Date(value).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—'

const formatDay = (value) =>
  new Date(value).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })

function PointageBadge({ pointage }) {
  return pointage === 'manuel' ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
      <UserCheck size={12} />
      Manuel
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
      <QrCode size={12} />
      Pass QR
    </span>
  )
}

function ReportCell({ row }) {
  return row.hasReport ? (
    <Link
      to={`/eleves/${row.childId}`}
      className="inline-flex items-center gap-1 text-xs font-medium text-navy hover:underline"
    >
      <FileText size={12} />
      Lire
    </Link>
  ) : (
    <span className="text-xs text-gray-400">En attente</span>
  )
}

function SessionsTable({ students, rowsFor }) {
  const [childFilter, setChildFilter] = useState('all')
  const rows = students
    .filter((child) => childFilter === 'all' || child.id === childFilter)
    .flatMap((child) =>
      rowsFor(child).map((row) => ({ ...row, childId: child.id, childName: child.name })),
    )
    .sort((a, b) => new Date(b.date) - new Date(a.date))
  const showChild = students.length > 1 && childFilter === 'all'

  return (
    <Card className="mt-6 overflow-hidden p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
        <div>
          <h2 className="font-serif text-lg font-bold text-navy">Détail des séances</h2>
          <p className="text-xs text-gray-500">
            Heure d'arrivée et de départ enregistrées par le pointage de l'enseignant.
          </p>
        </div>
        {students.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            {[{ id: 'all', name: 'Tous' }, ...students].map((child) => (
              <button
                key={child.id}
                type="button"
                onClick={() => setChildFilter(child.id)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  childFilter === child.id
                    ? 'bg-navy text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {child.name.split(' ')[0]}
              </button>
            ))}
          </div>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-gray-400">Aucune séance sur cette période.</p>
      ) : (
        <>
          {/* Ordinateur : tableau */}
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Date</th>
                  {showChild && <th className="px-3 py-3 font-medium">Enfant</th>}
                  <th className="px-3 py-3 font-medium">Matière · Enseignant</th>
                  <th className="px-3 py-3 font-medium">Arrivée → Départ</th>
                  <th className="px-3 py-3 text-right font-medium">Durée comptée</th>
                  <th className="px-3 py-3 font-medium">Pointage</th>
                  <th className="px-5 py-3 font-medium">Compte-rendu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50/60">
                    <td className="whitespace-nowrap px-5 py-3 font-medium capitalize text-gray-900">
                      {formatDay(row.date)}
                    </td>
                    {showChild && <td className="px-3 py-3 text-gray-700">{row.childName}</td>}
                    <td className="px-3 py-3">
                      <span className="block font-medium text-gray-900">{row.subject}</span>
                      <span className="block text-xs text-gray-500">{row.teacherName}</span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 tabular-nums text-gray-700">
                      {formatTime(row.checkinAt)} → {formatTime(row.checkoutAt)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-right font-semibold tabular-nums text-navy">
                      {formatDuration(row.minutes)}
                    </td>
                    <td className="px-3 py-3">
                      <PointageBadge pointage={row.pointage} />
                    </td>
                    <td className="px-5 py-3">
                      <ReportCell row={row} />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-navy/5 text-sm">
                <tr>
                  <td className="px-5 py-3 font-semibold text-navy" colSpan={showChild ? 4 : 3}>
                    Total · {rows.length} séance{rows.length > 1 ? 's' : ''}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right font-bold tabular-nums text-navy">
                    {formatDuration(sumMinutes(rows))}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Mobile : une fiche par seance */}
          <ul className="divide-y divide-gray-100 sm:hidden">
            {rows.map((row) => (
              <li key={row.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium capitalize text-gray-500">
                      {formatDay(row.date)}
                      {showChild && ` · ${row.childName}`}
                    </p>
                    <p className="truncate font-medium text-gray-900">{row.subject}</p>
                    <p className="truncate text-xs text-gray-500">avec {row.teacherName}</p>
                  </div>
                  <p className="shrink-0 font-semibold tabular-nums text-navy">
                    {formatDuration(row.minutes)}
                  </p>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600">
                  <span className="tabular-nums">
                    {formatTime(row.checkinAt)} → {formatTime(row.checkoutAt)}
                  </span>
                  <PointageBadge pointage={row.pointage} />
                  <ReportCell row={row} />
                </div>
              </li>
            ))}
            <li className="flex items-center justify-between bg-navy/5 px-4 py-3 text-sm font-semibold text-navy">
              <span>Total · {rows.length} séance{rows.length > 1 ? 's' : ''}</span>
              <span className="tabular-nums">{formatDuration(sumMinutes(rows))}</span>
            </li>
          </ul>
        </>
      )}

      <div className="flex flex-wrap gap-x-5 gap-y-1 border-t border-gray-100 bg-gray-50/60 px-5 py-3 text-xs text-gray-500">
        <span className="inline-flex items-center gap-1">
          <QrCode size={12} className="text-green-600" />
          Pass QR : l'enseignant a scanné le pass de l'élève
        </span>
        <span className="inline-flex items-center gap-1">
          <UserCheck size={12} className="text-amber-600" />
          Manuel : pointage de secours (pass oublié…)
        </span>
        <span className="inline-flex items-center gap-1">
          <CheckCircle2 size={12} className="text-navy" />
          Durée comptée : temps réel entre l'arrivée et le départ (durée prévue si le départ a été
          pointé en retard)
        </span>
      </div>
    </Card>
  )
}

export function Consommation() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [period, setPeriod] = useState(() => monthKey(new Date()))

  useEffect(() => {
    api
      .get('/family/hours')
      .then(setData)
      .catch((err) => setError(err.message))
  }, [])

  useAutoRefresh(() => {
    api.get('/family/hours').then(setData).catch(() => {})
  })

  // Mois disponibles : le mois en cours + tous ceux qui ont des seances.
  const months = useMemo(() => {
    const keys = new Set([monthKey(new Date())])
    for (const child of data?.children ?? []) {
      for (const session of child.sessions) keys.add(monthKey(session.date))
    }
    return [...keys].sort().reverse()
  }, [data])

  if (error) return <p className="text-red-600">{error}</p>
  if (!data) return <Spinner />

  const inPeriod = (rows) =>
    period === 'all' ? rows : rows.filter((row) => monthKey(row.date) === period)
  const allRows = data.children.flatMap((child) => inPeriod(child.sessions))
  const total = sumMinutes(allRows)
  const hasAnySession = data.children.some((child) => child.sessions.length > 0)
  const periodText = period === 'all' ? 'depuis le début' : monthLabel(period).toLowerCase()

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <Clock size={20} className="text-gold-500" />
          <h1 className="font-serif text-2xl font-bold text-navy">Consommation</h1>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Les heures de cours réalisées par vos enfants avec leurs enseignants Nafoore.
        </p>
      </div>

      {!hasAnySession ? (
        <Card className="p-8">
          <EmptyState
            icon={Clock}
            title="Aucune séance réalisée pour l'instant"
            description="Les heures apparaîtront ici dès qu'une séance aura été pointée du début à la fin."
          />
        </Card>
      ) : (
        <>
          <div className="-mx-1 mb-5 flex gap-2 overflow-x-auto px-1 pb-1">
            {[...months, 'all'].map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setPeriod(key)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  period === key
                    ? 'bg-navy text-white shadow-sm'
                    : 'border border-gray-200 bg-white text-gray-600 hover:border-navy/30 hover:text-navy'
                }`}
              >
                {key === 'all' ? 'Depuis le début' : monthLabel(key)}
              </button>
            ))}
          </div>

          <div className="mb-6 grid gap-3 sm:grid-cols-3">
            <StatTile
              icon={Hourglass}
              label="Heures de cours"
              value={formatDuration(total)}
              hint={periodText}
            />
            <StatTile
              icon={CalendarDays}
              label="Séances"
              value={allRows.length}
              hint={`réalisée${allRows.length > 1 ? 's' : ''} et pointée${allRows.length > 1 ? 's' : ''}`}
            />
            <StatTile
              icon={BookOpen}
              label="Durée moyenne"
              value={allRows.length ? formatDuration(total / allRows.length) : '—'}
              hint="par séance"
            />
          </div>

          <div className="space-y-4">
            {data.children.map((child) => (
              <ChildCard key={child.id} child={child} rows={inPeriod(child.sessions)} />
            ))}
          </div>

          <SessionsTable students={data.children} rowsFor={(child) => inPeriod(child.sessions)} />

          <p className="mt-6 text-center text-xs text-gray-400">
            Seules les séances pointées à l'arrivée et au départ de l'enseignant sont comptées.
          </p>
        </>
      )}
    </div>
  )
}
