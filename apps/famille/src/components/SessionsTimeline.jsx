import { useState } from 'react'
import { CalendarClock, ChevronDown, History } from 'lucide-react'
import { Badge } from './ui/Badge'
import { SessionReport, hasStructuredReport } from './SessionReport'
import { SessionActions, SessionChangeNote } from './SessionActions'
import { SESSION_STATUS_LABELS, SESSION_STATUS_TONES } from '../pages/labels'

const PAGE = 6

function DateBlock({ date }) {
  const d = new Date(date)
  return (
    <div className="flex w-14 shrink-0 flex-col items-center rounded-xl bg-navy/5 py-1.5 leading-tight">
      <span className="text-[10px] font-semibold uppercase text-gray-500">
        {d.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '')}
      </span>
      <span className="text-xl font-bold text-navy">{d.getDate()}</span>
      <span className="text-[10px] uppercase text-gray-500">
        {d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')}
      </span>
    </div>
  )
}

function timeRange(session) {
  const start = new Date(session.date)
  const end = new Date(start.getTime() + (session.durationMinutes ?? 60) * 60_000)
  const t = (d) => d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  return `${t(start)} – ${t(end)}`
}

// Une ligne = une seance : quand, quoi, avec qui, puis juste dessous ce qui
// s'est passe (compte-rendu, annulation, report…).
function SessionLine({ session, onChanged, upcoming }) {
  const hasReport = hasStructuredReport(session) || Boolean(session.notes)
  const isPast = new Date(session.date) < new Date()
  const awaitingReport =
    !upcoming && !hasReport && ['planifiee', 'confirmee', 'realisee'].includes(session.status) && isPast

  return (
    <li className="flex gap-3 py-3">
      <DateBlock date={session.date} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-gray-900">
            {session.subject ?? 'Séance'}
            <span className="ml-2 font-normal text-gray-500">{timeRange(session)}</span>
          </p>
          <Badge tone={SESSION_STATUS_TONES[session.status] ?? 'gray'}>
            {SESSION_STATUS_LABELS[session.status] ?? session.status}
          </Badge>
        </div>
        {session.teacher && <p className="text-xs text-gray-500">avec {session.teacher.name}</p>}
        <SessionChangeNote session={session} />

        {hasReport && (
          <div className="mt-2 rounded-lg border border-gray-100 bg-gray-50/70 px-3 py-2">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              Compte-rendu
            </p>
            <SessionReport session={session} />
          </div>
        )}
        {awaitingReport && (
          <p className="mt-1.5 text-xs italic text-gray-400">Compte-rendu en attente de l'enseignant.</p>
        )}
        {upcoming && <SessionActions session={session} onChanged={onChanged} />}
      </div>
    </li>
  )
}

// Seances d'un enfant, lues ligne par ligne : a venir en haut (dans l'ordre),
// puis l'historique (le plus recent d'abord) avec chaque compte-rendu sous
// sa seance.
export function SessionsTimeline({ sessions, onSessionChanged }) {
  const [shown, setShown] = useState(PAGE)
  const now = Date.now()
  const upcoming = sessions
    .filter((s) => new Date(s.date).getTime() >= now && s.status !== 'annulee' && s.status !== 'realisee')
    .concat(sessions.filter((s) => s.status === 'reportee' && new Date(s.date).getTime() < now))
    .sort((a, b) => new Date(a.date) - new Date(b.date))
  const upcomingIds = new Set(upcoming.map((s) => s.id))
  const history = sessions
    .filter((s) => !upcomingIds.has(s.id))
    .sort((a, b) => new Date(b.date) - new Date(a.date))

  if (sessions.length === 0) {
    return <p className="text-sm text-gray-500">Aucune séance pour l'instant.</p>
  }

  return (
    <div className="space-y-5">
      <section>
        <h3 className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500">
          <CalendarClock size={14} className="text-navy" />
          À venir
          <span className="font-normal normal-case tracking-normal text-gray-400">{upcoming.length}</span>
        </h3>
        {upcoming.length === 0 ? (
          <p className="py-2 text-sm text-gray-400">Aucune séance programmée.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {upcoming.map((session) => (
              <SessionLine key={session.id} session={session} onChanged={onSessionChanged} upcoming />
            ))}
          </ul>
        )}
      </section>

      {history.length > 0 && (
        <section>
          <h3 className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500">
            <History size={14} className="text-navy" />
            Historique et comptes-rendus
            <span className="font-normal normal-case tracking-normal text-gray-400">{history.length}</span>
          </h3>
          <ul className="divide-y divide-gray-100">
            {history.slice(0, shown).map((session) => (
              <SessionLine key={session.id} session={session} />
            ))}
          </ul>
          {history.length > shown && (
            <button
              type="button"
              onClick={() => setShown((n) => n + PAGE)}
              className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg border border-gray-100 py-2 text-xs font-medium text-navy hover:bg-gray-50"
            >
              Voir les séances précédentes ({history.length - shown})
              <ChevronDown size={14} />
            </button>
          )}
        </section>
      )}
    </div>
  )
}
