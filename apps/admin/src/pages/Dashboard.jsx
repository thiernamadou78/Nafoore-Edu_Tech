import { useEffect, useId, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  Contact2,
  Inbox,
  ListChecks,
  MapPin,
  Target,
  Users,
} from 'lucide-react'
import { api } from '../lib/api'
import { useAutoRefresh } from '../lib/useAutoRefresh'
import { useAuth } from '../context/AuthContext'
import { Alert } from '../components/ui/Alert'
import { Card } from '../components/ui/Card'
import { DashboardMap } from './DashboardMap'

const time = (value) =>
  new Date(value).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

// Mini-courbe (8 semaines) dessinee en SVG, sans librairie.
function Sparkline({ values, color = '#1E3A8A' }) {
  const gradientId = useId()
  if (!values?.length) return null
  const width = 120
  const height = 36
  const max = Math.max(...values, 1)
  const step = width / (values.length - 1 || 1)
  const points = values.map((v, i) => [i * step, height - 2 - (v / max) * (height - 6)])
  const line = points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `0,${height} ${line} ${width},${height}`
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-9 w-full" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${gradientId})`} />
      <polyline points={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

function Trend({ value, previous }) {
  if (previous === undefined || previous === null) return null
  if (previous === 0) {
    return value > 0 ? <span className="text-xs font-medium text-green-600">nouveau</span> : null
  }
  const pct = Math.round(((value - previous) / previous) * 100)
  const up = pct >= 0
  const Icon = up ? ArrowUpRight : ArrowDownRight
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${up ? 'text-green-600' : 'text-red-600'}`}>
      <Icon size={13} />
      {up ? '+' : ''}
      {pct} %
    </span>
  )
}

function KpiCard({ icon: Icon, label, value, suffix, children, footer }) {
  return (
    <Card className="flex flex-col p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</span>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy/5 text-navy">
          <Icon size={16} />
        </span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold tracking-tight text-gray-900">{value}</span>
        {suffix && <span className="text-sm text-gray-400">{suffix}</span>}
      </div>
      {footer && <div className="mt-1 text-xs text-gray-500">{footer}</div>}
      {children && <div className="mt-auto pt-3">{children}</div>}
    </Card>
  )
}

function ConversionRing({ rate }) {
  const pct = Math.round(rate * 100)
  const radius = 16
  const circumference = 2 * Math.PI * radius
  return (
    <svg viewBox="0 0 40 40" className="h-10 w-10 -rotate-90" aria-hidden="true">
      <circle cx="20" cy="20" r={radius} fill="none" stroke="#E5E7EB" strokeWidth="5" />
      <circle
        cx="20"
        cy="20"
        r={radius}
        fill="none"
        stroke="#EAB308"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={`${(pct / 100) * circumference} ${circumference}`}
      />
    </svg>
  )
}

const LIVE = {
  en_cours: { label: 'En cours', dot: 'bg-green-500 animate-pulse', text: 'text-green-700' },
  a_venir: { label: 'À venir', dot: 'bg-blue-500', text: 'text-blue-700' },
  terminee: { label: 'Terminée', dot: 'bg-gray-300', text: 'text-gray-500' },
  non_pointee: { label: 'Non pointée', dot: 'bg-amber-500', text: 'text-amber-700' },
}

function TodayCard({ sessions }) {
  const order = { en_cours: 0, non_pointee: 1, a_venir: 2, terminee: 3 }
  const sorted = [...sessions].sort(
    (a, b) => order[a.live] - order[b.live] || new Date(a.date) - new Date(b.date),
  )
  return (
    <Card className="flex flex-col p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-semibold text-gray-900">
          <CalendarDays size={16} className="text-navy" />
          Aujourd'hui
          <span className="text-sm font-normal text-gray-400">{sessions.length} séance{sessions.length > 1 ? 's' : ''}</span>
        </h2>
        <Link to="/planning" className="inline-flex items-center gap-1 text-xs font-medium text-navy hover:underline">
          Planning <ArrowRight size={12} />
        </Link>
      </div>
      {sorted.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-400">Aucune séance prévue aujourd'hui.</p>
      ) : (
        <ul className="-mx-2 max-h-80 space-y-1 overflow-y-auto">
          {sorted.map((s) => {
            const live = LIVE[s.live]
            return (
              <li key={s.id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-gray-50">
                <span className="w-12 shrink-0 text-sm font-semibold tabular-nums text-gray-900">{time(s.date)}</span>
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${live.dot}`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {s.subject ?? 'Séance'} ·{' '}
                    <Link to={`/eleves/${s.student.id}`} className="hover:underline">
                      {s.student.name}
                    </Link>
                  </p>
                  <p className="truncate text-xs text-gray-500">
                    {s.teacher?.name ?? 'Enseignant non assigné'} · jusqu'à {time(s.end)}
                  </p>
                </div>
                <span className={`shrink-0 text-xs font-medium ${live.text}`}>{live.label}</span>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}

const TODO_TONES = {
  red: 'bg-red-50 text-red-700',
  amber: 'bg-amber-50 text-amber-800',
  blue: 'bg-blue-50 text-blue-700',
}

function TodoCard({ items }) {
  const pending = items.filter((item) => item.count > 0)
  return (
    <Card className="flex flex-col p-5">
      <h2 className="mb-4 flex items-center gap-2 font-semibold text-gray-900">
        <ListChecks size={16} className="text-navy" />
        À traiter
      </h2>
      {pending.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-6 text-center">
          <CheckCircle2 size={28} className="mb-2 text-green-500" />
          <p className="text-sm font-medium text-gray-700">Tout est à jour</p>
          <p className="text-xs text-gray-400">Rien en attente pour le moment.</p>
        </div>
      ) : (
        <ul className="-mx-2 space-y-1">
          {pending.map((item) => (
            <li key={item.key}>
              <Link
                to={item.path}
                className="group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-gray-50"
              >
                <span
                  className={`flex h-7 min-w-[1.75rem] items-center justify-center rounded-md px-1.5 text-sm font-bold tabular-nums ${TODO_TONES[item.tone]}`}
                >
                  {item.count}
                </span>
                <span className="flex-1 text-sm text-gray-700">{item.label}</span>
                <ArrowRight size={14} className="text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-navy" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function HoursChart({ weeks }) {
  const max = Math.max(...weeks.map((w) => w.hours), 1)
  const total = weeks.reduce((sum, w) => sum + w.hours, 0)
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-semibold text-gray-900">
          <Clock size={16} className="text-navy" />
          Heures de cours par semaine
        </h2>
        <span className="text-xs text-gray-500">{Math.round(total)} h sur 8 semaines</span>
      </div>
      <div className="flex h-40 items-end gap-2">
        {weeks.map((week, index) => {
          const current = index === weeks.length - 1
          return (
            <div key={week.weekStart} className="group flex flex-1 flex-col items-center gap-1.5">
              <span className="text-[11px] font-medium tabular-nums text-gray-500 opacity-0 transition-opacity group-hover:opacity-100">
                {week.hours} h
              </span>
              <div
                className={`w-full rounded-t-md transition-colors ${
                  current ? 'bg-gold-500' : 'bg-navy/80 group-hover:bg-navy'
                }`}
                style={{ height: `${Math.max((week.hours / max) * 100, week.hours > 0 ? 4 : 1)}%` }}
                title={`${week.hours} h`}
              />
              <span className="text-[11px] text-gray-400">
                {new Date(week.weekStart).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }).replace('.', '')}
              </span>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

export function Dashboard() {
  const { adminAccount } = useAuth()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  const load = () =>
    api
      .get('/dashboard/cockpit')
      .then((result) => {
        setData(result)
        setError(null)
      })
      .catch((err) => setError(err.message))

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useAutoRefresh(load)

  if (error && !data) return <Alert>{error}</Alert>
  if (!data) return <p className="text-gray-500">Chargement…</p>

  const { kpis } = data
  const firstName = adminAccount?.name?.split(' ')[0] ?? ''
  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm capitalize text-gray-500">{today}</p>
          <h1 className="text-2xl font-semibold text-gray-900">Bonjour {firstName}</h1>
        </div>
        {adminAccount?.role !== 'super_admin' && adminAccount?.zoneAddress && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs text-gray-600 shadow-sm">
            <MapPin size={13} className="text-navy" />
            Votre zone : {adminAccount.zoneAddress} ({adminAccount.zoneRadiusKm} km)
          </span>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          icon={Users}
          label="Élèves actifs"
          value={kpis.students.value}
          footer={kpis.students.delta > 0 ? <span className="text-green-600">+{kpis.students.delta} {kpis.students.deltaLabel}</span> : null}
        />
        <KpiCard icon={Contact2} label="Enseignants actifs" value={kpis.teachers.value} />
        <KpiCard
          icon={Clock}
          label="Heures ce mois"
          value={kpis.hoursMonth.value}
          suffix="h"
          footer={
            <span className="flex items-center gap-1.5">
              <Trend value={kpis.hoursMonth.value} previous={kpis.hoursMonth.previous} />
              <span>vs mois dernier à date</span>
            </span>
          }
        >
          <Sparkline values={kpis.hoursMonth.series} />
        </KpiCard>
        <KpiCard
          icon={Inbox}
          label="Leads ce mois"
          value={kpis.leadsMonth.value}
          footer={
            <span className="flex items-center gap-1.5">
              <Trend value={kpis.leadsMonth.value} previous={kpis.leadsMonth.previous} />
              <span>vs mois dernier à date</span>
            </span>
          }
        >
          <Sparkline values={kpis.leadsMonth.series} color="#EAB308" />
        </KpiCard>
        <KpiCard icon={Target} label="Conversion" value={`${Math.round(kpis.conversionRate * 100)} %`} footer="Leads devenus inscriptions">
          <ConversionRing rate={kpis.conversionRate} />
        </KpiCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <TodayCard sessions={data.today} />
        </div>
        <div className="lg:col-span-2">
          <TodoCard items={data.todo} />
        </div>
      </div>

      <HoursChart weeks={data.hoursByWeek} />

      <DashboardMap />
    </div>
  )
}
