import { useEffect, useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { Badge } from './ui/Badge'
import { SessionReport, Stars, hasStructuredReport } from './SessionReport'
import { SessionActions, SessionChangeNote } from './SessionActions'
import { SESSION_STATUS_LABELS, SESSION_STATUS_TONES } from '../pages/labels'
import { subjectPalette } from '../lib/subjectColors'

const PAGE_SIZE = 5

const shortDate = (date) =>
  new Date(date)
    .toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit' })
    .replace('.', '')
const time = (date) => new Date(date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

// Une seance = une ligne compacte ; le compte-rendu est resume (chapitre +
// etoiles) et s'ouvre d'un clic.
function SessionRow({ session, color, upcoming, onChanged }) {
  const [open, setOpen] = useState(false)
  const hasReport = hasStructuredReport(session) || Boolean(session.notes)
  const isPast = new Date(session.date) < new Date()
  const awaitingReport = !upcoming && !hasReport && session.status !== 'annulee' && isPast

  return (
    <li className="py-2.5">
      <div className="flex items-center gap-3">
        <div className="w-16 shrink-0 text-xs leading-tight">
          <p className="font-semibold capitalize text-gray-900">{shortDate(session.date)}</p>
          <p className="text-gray-500">{time(session.date)}</p>
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 truncate text-sm font-medium text-gray-900">
            <span className={`h-2 w-2 shrink-0 rounded-full ${color.dot}`} />
            <span className="truncate">{session.subject ?? 'Séance'}</span>
            {session.teacher && (
              <span className="hidden truncate text-xs font-normal text-gray-400 sm:inline">
                · {session.teacher.name}
              </span>
            )}
          </p>
          {/* Resume du compte-rendu sur une ligne */}
          {hasReport && hasStructuredReport(session) && (
            <p className="flex flex-wrap items-center gap-x-2 truncate text-xs text-gray-500">
              {session.chapter && <span className="truncate">{session.chapter}</span>}
              {session.understanding && (
                <span title="Compréhension">
                  <Stars value={session.understanding} />
                </span>
              )}
            </p>
          )}
          {awaitingReport && <p className="text-xs italic text-gray-400">Compte-rendu en attente</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {(upcoming || session.status === 'annulee' || session.status === 'reportee') && (
            <Badge tone={SESSION_STATUS_TONES[session.status] ?? 'gray'}>
              {SESSION_STATUS_LABELS[session.status] ?? session.status}
            </Badge>
          )}
          {hasReport && (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="inline-flex items-center gap-0.5 rounded-full px-2 py-1 text-xs font-medium text-navy hover:bg-navy/5"
            >
              {open ? 'Masquer' : 'Voir'}
              <ChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>
      </div>

      <div className="pl-[4.75rem]">
        <SessionChangeNote session={session} />
        {open && hasReport && (
          <div className="mt-2 rounded-lg border border-gray-100 bg-gray-50/70 px-3 py-2">
            <SessionReport session={session} />
          </div>
        )}
        {upcoming && <SessionActions session={session} onChanged={onChanged} />}
      </div>
    </li>
  )
}

function Pager({ page, pages, onChange }) {
  if (pages <= 1) return null
  return (
    <div className="mt-2 flex items-center justify-center gap-1 text-xs">
      <button
        type="button"
        disabled={page === 0}
        onClick={() => onChange(page - 1)}
        className="rounded-full p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-30"
        aria-label="Page précédente"
      >
        <ChevronLeft size={16} />
      </button>
      {Array.from({ length: pages }, (_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          className={`h-7 min-w-[1.75rem] rounded-full px-2 font-medium ${
            i === page ? 'bg-navy text-white' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          {i + 1}
        </button>
      ))}
      <button
        type="button"
        disabled={page >= pages - 1}
        onClick={() => onChange(page + 1)}
        className="rounded-full p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-30"
        aria-label="Page suivante"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  )
}

// Suivi des seances d'un enfant, sans longue page a faire defiler :
// onglets A venir / Realisees / Annulees, filtre par matiere, 5 seances par
// page, compte-rendu resume et depliable.
export function SessionsTimeline({ sessions: allSessions, onSessionChanged }) {
  const [subject, setSubject] = useState('all')
  const colorOf = subjectPalette(allSessions.map((s) => s.subject))
  const subjects = [...new Set(allSessions.map((s) => s.subject).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'fr'),
  )
  const sessions = subject === 'all' ? allSessions : allSessions.filter((s) => s.subject === subject)

  const now = Date.now()
  const isUpcoming = (s) =>
    s.status === 'reportee' ||
    (new Date(s.date).getTime() >= now && s.status !== 'annulee' && s.status !== 'realisee')
  const groups = {
    upcoming: sessions.filter(isUpcoming).sort((a, b) => new Date(a.date) - new Date(b.date)),
    done: sessions
      .filter((s) => !isUpcoming(s) && s.status !== 'annulee')
      .sort((a, b) => new Date(b.date) - new Date(a.date)),
    cancelled: sessions
      .filter((s) => s.status === 'annulee')
      .sort((a, b) => new Date(b.date) - new Date(a.date)),
  }
  const tabs = [
    { key: 'upcoming', label: 'À venir' },
    { key: 'done', label: 'Réalisées' },
    { key: 'cancelled', label: 'Annulées' },
  ].filter((t) => t.key !== 'cancelled' || groups.cancelled.length > 0)

  const [tab, setTab] = useState(() => (groups.upcoming.length > 0 ? 'upcoming' : 'done'))
  const [page, setPage] = useState(0)
  useEffect(() => setPage(0), [tab, subject])

  if (allSessions.length === 0) {
    return <p className="text-sm text-gray-500">Aucune séance pour l'instant.</p>
  }

  const list = groups[tab] ?? []
  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE))
  const current = Math.min(page, pages - 1)
  const visible = list.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE)

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-full bg-gray-100 p-1 text-xs">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`rounded-full px-3 py-1.5 font-medium transition-colors ${
                tab === t.key ? 'bg-white text-navy shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label} <span className="text-gray-400">{groups[t.key].length}</span>
            </button>
          ))}
        </div>
        {subjects.length > 1 && (
          <div className="flex flex-wrap gap-1">
            {[{ key: 'all', label: 'Toutes' }, ...subjects.map((s) => ({ key: s, label: s }))].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setSubject(item.key)}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                  subject === item.key
                    ? 'bg-navy text-white'
                    : 'border border-gray-200 bg-white text-gray-600 hover:border-navy/30'
                }`}
              >
                {item.key !== 'all' && <span className={`h-1.5 w-1.5 rounded-full ${colorOf(item.key).dot}`} />}
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {visible.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-400">
          {tab === 'upcoming' ? 'Aucune séance programmée.' : 'Aucune séance.'}
        </p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {visible.map((session) => (
            <SessionRow
              key={session.id}
              session={session}
              color={colorOf(session.subject)}
              upcoming={tab === 'upcoming'}
              onChanged={onSessionChanged}
            />
          ))}
        </ul>
      )}
      <Pager page={current} pages={pages} onChange={setPage} />
    </div>
  )
}
