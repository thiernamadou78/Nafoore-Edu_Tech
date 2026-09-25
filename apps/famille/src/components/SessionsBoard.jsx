import { Badge } from './ui/Badge'
import { PaginationControls } from './ui/PaginationControls'
import { usePagination } from '../lib/usePagination'
import { formatDateTime } from '../lib/format'
import { SessionReport } from './SessionReport'
import { SessionActions, SessionChangeNote } from './SessionActions'

// Grille 3 colonnes (À venir / Réalisées / Rejetées), même logique que côté
// admin/prof — réutilisée sur la fiche élève et sur l'onglet Planning.
export function SessionsBoard({ sessions, onSessionChanged }) {
  const upcomingSessions = [...sessions]
    .filter((s) => s.status !== 'realisee' && s.status !== 'annulee')
    .sort((a, b) => new Date(a.date) - new Date(b.date))
  const realisedSessions = [...sessions]
    .filter((s) => s.status === 'realisee')
    .sort((a, b) => new Date(b.date) - new Date(a.date))
  const rejectedSessions = [...sessions]
    .filter((s) => s.status === 'annulee')
    .sort((a, b) => new Date(b.date) - new Date(a.date))

  const upcomingPage = usePagination(upcomingSessions, 5)
  const realisedPage = usePagination(realisedSessions, 5)
  const rejectedPage = usePagination(rejectedSessions, 5)

  if (sessions.length === 0) {
    return <p className="text-sm text-gray-500">Aucune séance pour l'instant.</p>
  }

  const columns = [
    { key: 'upcoming', title: 'À venir', tone: 'blue', count: upcomingSessions.length, page: upcomingPage },
    { key: 'realisees', title: 'Réalisées', tone: 'green', count: realisedSessions.length, page: realisedPage },
    ...(rejectedSessions.length > 0
      ? [{ key: 'rejetees', title: 'Rejetées', tone: 'red', count: rejectedSessions.length, page: rejectedPage }]
      : []),
  ]

  return (
    <div className={`grid gap-3 ${rejectedSessions.length > 0 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
      {columns.map((column) => (
        <div key={column.key} className="rounded-lg border border-gray-100">
          <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">
              {column.title}
            </h3>
            <Badge tone={column.tone}>{column.count}</Badge>
          </div>
          <div className="p-2">
            {column.page.visible.length === 0 ? (
              <p className="py-2 text-center text-xs text-gray-400">Aucune séance.</p>
            ) : (
              <>
                <ul className="divide-y divide-gray-100">
                  {column.page.visible.map((session) => (
                    <li key={session.id} className="py-2 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-gray-800">
                          {formatDateTime(session.date)}
                          {session.subject ? ` · ${session.subject}` : ''}
                        </p>
                        {session.attended === true && <Badge tone="leaf">Présent</Badge>}
                        {session.attended === false && <Badge tone="clay">Absent</Badge>}
                      </div>
                      {session.teacher && (
                        <p className="text-[11px] text-gray-400">{session.teacher.name}</p>
                      )}
                      <SessionChangeNote session={session} />
                      <div className="mt-1">
                        <SessionReport session={session} />
                      </div>
                      {onSessionChanged && (
                        <SessionActions session={session} onChanged={onSessionChanged} />
                      )}
                    </li>
                  ))}
                </ul>
                <PaginationControls
                  {...column.page}
                  onShowMore={column.page.showMore}
                  onCollapse={column.page.collapse}
                  className="pt-2"
                />
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
