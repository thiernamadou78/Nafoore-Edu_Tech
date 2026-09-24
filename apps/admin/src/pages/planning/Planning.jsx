import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, ChevronLeft, ChevronRight, Clock, FileText, QrCode, UserCheck } from 'lucide-react'
import { api } from '../../lib/api'
import { useAutoRefresh } from '../../lib/useAutoRefresh'
import { Alert } from '../../components/ui/Alert'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { PlanningCalendar } from '../../components/ui/PlanningCalendar'
import { CLASS_LABELS } from '../../lib/levels'
import { SESSION_STATUS_LABELS, SESSION_STATUS_TONES } from '../students/labels'

const selectClass =
  'rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy'

function startOfWeek(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)) // lundi
  return d
}
const addDays = (date, days) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
const sameDay = (a, b) => a.toDateString() === b.toDateString()
const time = (value) =>
  new Date(value).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

// Seance passee, non annulee/realisee et jamais pointee : a surveiller.
function isToCheck(session) {
  const end = new Date(session.date).getTime() + session.durationMinutes * 60_000
  return (
    end < Date.now() &&
    !['annulee', 'realisee', 'reportee'].includes(session.status) &&
    !session.checkoutAt
  )
}

function SessionCard({ session, compact = false }) {
  const toCheck = isToCheck(session)
  const end = new Date(new Date(session.date).getTime() + session.durationMinutes * 60_000)
  const accent = toCheck
    ? 'border-l-amber-500'
    : session.status === 'realisee'
      ? 'border-l-green-500'
      : session.status === 'annulee'
        ? 'border-l-red-400'
        : 'border-l-navy'
  return (
    <div
      className={`rounded-lg border border-l-4 border-gray-100 bg-white p-2.5 text-xs shadow-sm ${accent} ${
        session.status === 'annulee' ? 'opacity-60' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold tabular-nums text-gray-900">
          {time(session.date)}–{time(end)}
        </span>
        {toCheck ? (
          <Badge tone="amber">À pointer</Badge>
        ) : (
          !compact && (
            <Badge tone={SESSION_STATUS_TONES[session.status]}>
              {SESSION_STATUS_LABELS[session.status] ?? session.status}
            </Badge>
          )
        )}
      </div>
      <p className="mt-1 truncate font-medium text-navy">{session.subject ?? 'Séance'}</p>
      <Link to={`/eleves/${session.student.id}`} className="block truncate text-gray-700 hover:underline">
        {session.student.name}
        {session.student.classe && (
          <span className="text-gray-400"> · {CLASS_LABELS[session.student.classe] ?? session.student.classe}</span>
        )}
      </Link>
      {session.teacher && (
        <Link to={`/enseignants/${session.teacher.id}`} className="block truncate text-gray-500 hover:underline">
          avec {session.teacher.name}
        </Link>
      )}
      {(session.checkinAt || session.hasReport) && (
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
          {session.checkinAt && (
            <span className="inline-flex items-center gap-1">
              {session.pointage === 'manuel' ? <UserCheck size={11} /> : <QrCode size={11} />}
              {time(session.checkinAt)}
              {session.checkoutAt ? `→${time(session.checkoutAt)}` : ' (en cours)'}
            </span>
          )}
          {session.hasReport && (
            <span className="inline-flex items-center gap-1 text-green-700">
              <FileText size={11} />
              CR
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export function Planning() {
  const [view, setView] = useState('semaine')
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [teacherFilter, setTeacherFilter] = useState('')
  const [studentFilter, setStudentFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const range = useMemo(() => {
    if (view === 'semaine') return { from: weekStart, to: addDays(weekStart, 7) }
    // Mois affiche + debordement de la grille (semaines completes).
    const first = startOfWeek(month)
    return { from: first, to: addDays(first, 42) }
  }, [view, weekStart, month])

  const load = useCallback(
    () =>
      api
        .get(`/planning?from=${range.from.toISOString()}&to=${range.to.toISOString()}`)
        .then((data) => {
          setSessions(data)
          setError(null)
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false)),
    [range],
  )

  useEffect(() => {
    setLoading(true)
    load()
  }, [load])
  useAutoRefresh(load)

  // Listes des filtres construites a partir des seances de la periode.
  const teachers = useMemo(
    () =>
      [...new Map(sessions.filter((s) => s.teacher).map((s) => [s.teacher.id, s.teacher])).values()].sort(
        (a, b) => a.name.localeCompare(b.name),
      ),
    [sessions],
  )
  const students = useMemo(
    () =>
      [...new Map(sessions.map((s) => [s.student.id, s.student])).values()].sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
    [sessions],
  )

  const visible = sessions.filter(
    (s) =>
      (!teacherFilter || s.teacher?.id === teacherFilter) &&
      (!studentFilter || s.student.id === studentFilter) &&
      (!statusFilter || (statusFilter === 'a_pointer' ? isToCheck(s) : s.status === statusFilter)),
  )

  const counts = {
    total: visible.length,
    realisee: visible.filter((s) => s.status === 'realisee').length,
    aPointer: visible.filter(isToCheck).length,
    annulee: visible.filter((s) => s.status === 'annulee').length,
  }

  const today = new Date()
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const periodLabel =
    view === 'semaine'
      ? `${weekStart.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} – ${addDays(weekStart, 6).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`
      : null

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarDays size={20} className="text-navy" />
          <h1 className="text-xl font-semibold text-gray-900">Planning</h1>
        </div>
        <div className="flex rounded-lg border border-gray-200 bg-white p-0.5">
          {['semaine', 'mois'].map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setView(key)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                view === key ? 'bg-navy text-white' : 'text-gray-600 hover:text-navy'
              }`}
            >
              {key}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {view === 'semaine' && (
          <div className="mr-2 flex items-center gap-1">
            <button
              type="button"
              onClick={() => setWeekStart((w) => addDays(w, -7))}
              aria-label="Semaine précédente"
              className="rounded-full p-1.5 text-gray-500 hover:bg-gray-100"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => setWeekStart(startOfWeek(new Date()))}
              className="rounded-full px-3 py-1 text-sm font-medium text-navy hover:bg-navy/5"
            >
              Aujourd'hui
            </button>
            <button
              type="button"
              onClick={() => setWeekStart((w) => addDays(w, 7))}
              aria-label="Semaine suivante"
              className="rounded-full p-1.5 text-gray-500 hover:bg-gray-100"
            >
              <ChevronRight size={18} />
            </button>
            <span className="ml-1 text-sm font-medium text-gray-700">{periodLabel}</span>
          </div>
        )}
        <select value={teacherFilter} onChange={(e) => setTeacherFilter(e.target.value)} className={selectClass}>
          <option value="">Tous les enseignants</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <select value={studentFilter} onChange={(e) => setStudentFilter(e.target.value)} className={selectClass}>
          <option value="">Tous les élèves</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectClass}>
          <option value="">Tous les statuts</option>
          <option value="a_pointer">À pointer</option>
          {Object.entries(SESSION_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-5 flex flex-wrap gap-2 text-sm">
        <span className="rounded-full bg-navy/5 px-3 py-1 font-medium text-navy">
          {counts.total} séance{counts.total > 1 ? 's' : ''}
        </span>
        <span className="rounded-full bg-green-50 px-3 py-1 text-green-700">{counts.realisee} réalisée(s)</span>
        <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-800">{counts.aPointer} à pointer</span>
        <span className="rounded-full bg-red-50 px-3 py-1 text-red-700">{counts.annulee} annulée(s)</span>
      </div>

      {error && <Alert>{error}</Alert>}

      {view === 'semaine' ? (
        <div className="grid gap-3 md:grid-cols-7">
          {days.map((day) => {
            const daySessions = visible.filter((s) => sameDay(new Date(s.date), day))
            const isToday = sameDay(day, today)
            return (
              <div key={day.toISOString()} className="min-w-0">
                <div
                  className={`mb-2 rounded-lg px-2 py-1.5 text-center ${
                    isToday ? 'bg-navy text-white' : 'bg-white text-gray-700 shadow-sm'
                  }`}
                >
                  <p className="text-[11px] font-medium uppercase tracking-wide opacity-70">
                    {day.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '')}
                  </p>
                  <p className="text-lg font-bold leading-tight">{day.getDate()}</p>
                </div>
                <div className="space-y-2">
                  {loading && sessions.length === 0 ? null : daySessions.length === 0 ? (
                    <p className="py-3 text-center text-xs text-gray-300">—</p>
                  ) : (
                    daySessions.map((session) => <SessionCard key={session.id} session={session} compact />)
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <PlanningCalendar
          sessions={visible}
          onMonthChange={(m) => setMonth((current) => (current.getTime() === m.getTime() ? current : m))}
          renderSession={(session) => <SessionCard session={session} />}
        />
      )}

      {!loading && visible.length === 0 && (
        <Card className="mt-4 p-6 text-center text-sm text-gray-500">
          <Clock size={18} className="mx-auto mb-2 text-gray-300" />
          Aucune séance sur cette période.
        </Card>
      )}
    </div>
  )
}
