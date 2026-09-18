import { useEffect, useState } from 'react'
import { CalendarPlus, Check, ScanLine, X } from 'lucide-react'
import { api } from '../lib/api'
import { formatDate } from '../lib/format'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { PaginationControls } from '../components/ui/PaginationControls'
import { PlanningCalendar } from '../components/PlanningCalendar'
import { Spinner } from '../components/ui/Spinner'
import { usePagination } from '../lib/usePagination'
import { SESSION_STATUS_LABELS, SESSION_STATUS_TONES } from './labels'

const MANUAL_REASON_LABELS = {
  qr_oublie: 'Pass QR oublié',
  probleme_technique: 'Problème technique',
  autre: 'Autre',
}

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy'

const SESSIONS_PAGE_SIZE = 5

const DURATION_OPTIONS = [
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1h' },
  { value: 90, label: '1h30' },
  { value: 120, label: '2h' },
]

function formatTimeRange(date, durationMinutes) {
  const start = new Date(date)
  const end = new Date(start.getTime() + durationMinutes * 60000)
  const dateLabel = formatDate(start)
  const startLabel = start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  const endLabel = end.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  return `${dateLabel}, ${startLabel} – ${endLabel}`
}

function ReportForm({ session, onCancel, onSave, saving }) {
  const [attended, setAttended] = useState(session.attended ?? true)
  const [notes, setNotes] = useState(session.notes ?? '')

  return (
    <div className="mt-3 space-y-3 border-t border-gray-100 pt-3">
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={attended}
          onChange={(e) => setAttended(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-navy focus:ring-navy"
        />
        Élève présent
      </label>
      <textarea
        required
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={3}
        placeholder="Ce qui a été travaillé, points à retravailler… (obligatoire pour clôturer la séance)"
        className={`${inputClass} resize-none`}
      />
      <div className="flex gap-2">
        <Button
          loading={saving}
          disabled={!notes.trim()}
          onClick={() => onSave({ attended, notes, status: 'realisee' })}
        >
          Enregistrer
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          Annuler
        </Button>
      </div>
    </div>
  )
}

function CancelForm({ onCancel, onConfirm, saving }) {
  const [reason, setReason] = useState('')

  return (
    <div className="mt-3 space-y-3 border-t border-gray-100 pt-3">
      <label className="block text-xs font-medium text-gray-500">
        Motif de l'annulation <span className="text-red-500">*</span>
      </label>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={2}
        placeholder="Élève malade, empêchement de dernière minute…"
        className={`${inputClass} resize-none`}
      />
      <div className="flex gap-2">
        <Button
          variant="danger"
          loading={saving}
          disabled={!reason.trim()}
          onClick={() => onConfirm(reason)}
        >
          Confirmer l'annulation
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          Retour
        </Button>
      </div>
    </div>
  )
}

function ManualAttendanceForm({ onCancel, onConfirm, saving }) {
  const [reason, setReason] = useState('qr_oublie')

  return (
    <div className="mt-3 space-y-3 border-t border-gray-100 pt-3">
      <label className="block text-xs font-medium text-gray-500">Motif du pointage manuel</label>
      <select
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className={inputClass}
      >
        {Object.entries(MANUAL_REASON_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <div className="flex gap-2">
        <Button icon={ScanLine} loading={saving} onClick={() => onConfirm(reason)}>
          Confirmer le pointage
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          Annuler
        </Button>
      </div>
    </div>
  )
}

// Le statut brut ('planifiee') ne dit rien de vécu une fois la date passée :
// on distingue visuellement "en cours" (check-in scanné, pas encore de
// check-out) et "passée sans pointage" (ni scan ni compte-rendu), sans
// jamais réécrire le statut réel en base tant que le prof n'a rien confirmé.
function getDisplayStatus(session, isPast) {
  const isCheckedIn = session.lastAttendance?.checkinAt && !session.lastAttendance?.checkoutAt
  if (isCheckedIn) {
    return { tone: 'amber', label: 'En cours' }
  }
  if (isPast && (session.status === 'planifiee' || session.status === 'confirmee')) {
    return { tone: 'clay', label: 'Passée — à confirmer' }
  }
  return {
    tone: SESSION_STATUS_TONES[session.status] ?? 'gray',
    label: SESSION_STATUS_LABELS[session.status] ?? session.status,
  }
}

function SessionRow({
  session,
  onCancelSession,
  onSaveReport,
  onManualAttendance,
  savingId,
  compact = false,
  showStudentName = true,
  autoOpenReport = false,
}) {
  const [reportOpen, setReportOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [manualOpen, setManualOpen] = useState(false)

  // Juste après un pointage manuel, on pousse directement le prof à
  // renseigner le compte-rendu au lieu d'attendre qu'il pense à revenir sur
  // cette ligne plus tard (cf. gap : les séances pointées sans note restaient
  // invisibles indéfiniment).
  useEffect(() => {
    if (autoOpenReport) setReportOpen(true)
  }, [autoOpenReport])
  const hasReport = session.status === 'realisee' && (session.notes || session.attended !== null)
  const isPast = new Date(session.date) < new Date()
  // Reflete cote client la fenetre appliquee par le backend
  // (attendance.service.ts) : le pointage manuel est un secours ponctuel,
  // pas un moyen de valider une seance des jours avant/apres.
  const scheduledStart = new Date(session.date)
  const scheduledEnd = new Date(scheduledStart.getTime() + session.durationMinutes * 60000)
  const withinManualWindow =
    Date.now() >= scheduledStart.getTime() - 30 * 60000 &&
    Date.now() <= scheduledEnd.getTime() + 6 * 3600000
  // Une presence deja pointee (QR ou manuel) n'a pas besoin d'un second
  // pointage : il ne manque plus que le compte-rendu pour cloturer.
  const hasCompletedAttendance = Boolean(
    session.lastAttendance?.checkinAt && session.lastAttendance?.checkoutAt,
  )
  const canPointManually =
    (session.status === 'planifiee' || session.status === 'confirmee') &&
    withinManualWindow &&
    !hasCompletedAttendance
  const displayStatus = getDisplayStatus(session, isPast)
  const Wrapper = compact ? 'div' : Card
  const wrapperClassName = compact
    ? 'rounded-lg border border-gray-200 bg-white p-3'
    : 'p-4'

  return (
    <Wrapper className={wrapperClassName}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          {showStudentName && <p className="font-medium text-gray-900">{session.studentName}</p>}
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-600">
            {session.subject && <Badge tone="gold">{session.subject}</Badge>}
            <span>{formatTimeRange(session.date, session.durationMinutes)}</span>
            <Badge tone={displayStatus.tone}>{displayStatus.label}</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          {!isPast &&
            (session.status === 'planifiee' || session.status === 'confirmee') &&
            !cancelOpen && (
              <Button
                variant="secondary"
                icon={X}
                disabled={savingId === session.id}
                onClick={() => setCancelOpen(true)}
              >
                Annuler
              </Button>
            )}
          {isPast && session.status !== 'annulee' && !hasReport && !reportOpen && (
            <Button icon={CalendarPlus} onClick={() => setReportOpen(true)}>
              Rédiger le compte-rendu
            </Button>
          )}
          {hasReport && !reportOpen && (
            <Button variant="secondary" onClick={() => setReportOpen(true)}>
              Modifier le compte-rendu
            </Button>
          )}
          {canPointManually && !cancelOpen && !manualOpen && (
            <Button
              variant="secondary"
              icon={ScanLine}
              disabled={savingId === session.id}
              onClick={() => setManualOpen(true)}
            >
              Pointage manuel
            </Button>
          )}
        </div>
      </div>

      {manualOpen && (
        <ManualAttendanceForm
          saving={savingId === session.id}
          onCancel={() => setManualOpen(false)}
          onConfirm={(reason) =>
            onManualAttendance(session.id, reason).then(() => setManualOpen(false))
          }
        />
      )}

      {hasReport && !reportOpen && (
        <div className="mt-3 border-t border-gray-100 pt-3 text-sm text-gray-700">
          <p className="mb-1 flex items-center gap-1.5 font-medium text-gray-900">
            {session.attended ? (
              <Check size={14} className="text-leaf-600" />
            ) : (
              <X size={14} className="text-clay-600" />
            )}
            {session.attended ? 'Élève présent' : 'Élève absent'}
          </p>
          {session.notes && <p className="text-gray-600">{session.notes}</p>}
        </div>
      )}

      {session.status === 'annulee' && session.cancellationReason && (
        <div className="mt-3 border-t border-gray-100 pt-3 text-sm text-gray-700">
          <p className="mb-1 font-medium text-gray-900">Motif de l'annulation</p>
          <p className="text-gray-600">{session.cancellationReason}</p>
        </div>
      )}

      {reportOpen && (
        <ReportForm
          session={session}
          saving={savingId === session.id}
          onCancel={() => setReportOpen(false)}
          onSave={(data) => onSaveReport(session.id, data).then(() => setReportOpen(false))}
        />
      )}

      {cancelOpen && (
        <CancelForm
          saving={savingId === session.id}
          onCancel={() => setCancelOpen(false)}
          onConfirm={(reason) =>
            onCancelSession(session.id, reason).then(() => setCancelOpen(false))
          }
        />
      )}
    </Wrapper>
  )
}

function StudentPlanningCard({
  student,
  sessions,
  savingId,
  creating,
  onOpenCreate,
  onCloseCreate,
  onSubmitCreate,
  onCancelSession,
  onSaveReport,
  onManualAttendance,
  autoReportIds,
}) {
  const [createForm, setCreateForm] = useState({
    subject: '',
    date: '',
    durationMinutes: 60,
  })

  // Regroupement par statut (et non par date) : une séance planifiée mais
  // passée sans pointage reste "à venir" (à confirmer) tant qu'elle n'a pas
  // de statut définitif — cohérent avec la vue admin.
  const upcoming = [...sessions]
    .filter((s) => s.status !== 'realisee' && s.status !== 'annulee')
    .sort((a, b) => new Date(a.date) - new Date(b.date))
  const realisees = [...sessions]
    .filter((s) => s.status === 'realisee')
    .sort((a, b) => new Date(b.date) - new Date(a.date))
  const rejetees = [...sessions]
    .filter((s) => s.status === 'annulee')
    .sort((a, b) => new Date(b.date) - new Date(a.date))

  const upcomingPage = usePagination(upcoming, SESSIONS_PAGE_SIZE)
  const realiseesPage = usePagination(realisees, SESSIONS_PAGE_SIZE)
  const rejeteesPage = usePagination(rejetees, SESSIONS_PAGE_SIZE)
  const hasRejetees = rejetees.length > 0

  const columns = [
    { key: 'upcoming', title: 'À venir', tone: 'blue', items: upcoming, page: upcomingPage },
    { key: 'realisees', title: 'Réalisées', tone: 'green', items: realisees, page: realiseesPage },
    ...(hasRejetees
      ? [{ key: 'rejetees', title: 'Rejetées', tone: 'red', items: rejetees, page: rejeteesPage }]
      : []),
  ]

  const isCreatingHere = creating === student.id

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmitCreate(student.id, createForm).then(() => {
      setCreateForm({ subject: '', date: '', durationMinutes: 60 })
    })
  }

  return (
    <Card className="flex flex-col p-5">
      <div className="mb-4 flex items-center justify-between gap-2 border-b border-gray-100 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy/10 text-sm font-bold text-navy">
            {student.name.charAt(0).toUpperCase()}
          </span>
          <h2 className="font-semibold text-gray-900">{student.name}</h2>
        </div>
        <Button
          variant="secondary"
          icon={CalendarPlus}
          onClick={() => (isCreatingHere ? onCloseCreate() : onOpenCreate(student.id))}
        >
          Planifier
        </Button>
      </div>

      {isCreatingHere && (
        <form onSubmit={handleSubmit} className="mb-4 space-y-2 rounded-lg bg-gray-50 p-3">
          <select
            required
            value={createForm.subject}
            onChange={(e) => setCreateForm((f) => ({ ...f, subject: e.target.value }))}
            className={inputClass}
          >
            <option value="">Matière…</option>
            {student.subjects.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </select>
          <input
            required
            type="datetime-local"
            value={createForm.date}
            onChange={(e) => setCreateForm((f) => ({ ...f, date: e.target.value }))}
            className={inputClass}
          />
          <select
            value={createForm.durationMinutes}
            onChange={(e) =>
              setCreateForm((f) => ({ ...f, durationMinutes: Number(e.target.value) }))
            }
            className={inputClass}
          >
            {DURATION_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <Button type="submit" loading={savingId === 'create'}>
              Confirmer
            </Button>
            <Button type="button" variant="secondary" onClick={onCloseCreate}>
              Annuler
            </Button>
          </div>
        </form>
      )}

      <div className={`grid gap-3 ${hasRejetees ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
        {columns.map((column) => (
          <div key={column.key} className="rounded-lg border border-gray-100">
            <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                {column.title}
              </h3>
              <Badge tone={column.tone}>{column.items.length}</Badge>
            </div>
            <div className="p-2">
              {column.items.length === 0 ? (
                <p className="py-2 text-center text-xs text-gray-400">Aucune séance.</p>
              ) : (
                <>
                  <div className="space-y-2">
                    {column.page.visible.map((session) => (
                      <SessionRow
                        key={session.id}
                        session={session}
                        savingId={savingId}
                        compact
                        showStudentName={false}
                        onCancelSession={onCancelSession}
                        onSaveReport={onSaveReport}
                        onManualAttendance={onManualAttendance}
                        autoOpenReport={autoReportIds.has(session.id)}
                      />
                    ))}
                  </div>
                  <PaginationControls
                    {...column.page}
                    onShowMore={column.page.showMore}
                    onCollapse={column.page.collapse}
                    className="mt-2"
                  />
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

export function Planning() {
  const [sessions, setSessions] = useState(null)
  const [students, setStudents] = useState(null)
  const [error, setError] = useState(null)
  const [savingId, setSavingId] = useState(null)
  const [creatingForStudentId, setCreatingForStudentId] = useState(null)
  const [autoReportIds, setAutoReportIds] = useState(() => new Set())
  const [view, setView] = useState('calendrier')

  const load = () =>
    Promise.all([api.get('/teacher/sessions'), api.get('/teacher/students')])
      .then(([s, st]) => {
        setSessions(s)
        setStudents(st)
      })
      .catch((err) => setError(err.message))

  useEffect(() => {
    load()
  }, [])

  const handleCancelSession = (id, reason) => {
    setSavingId(id)
    return api
      .patch(`/teacher/sessions/${id}`, { status: 'annulee', cancellationReason: reason })
      .then(load)
      .catch((err) => setError(err.message))
      .finally(() => setSavingId(null))
  }

  const handleSaveReport = (id, data) => {
    setSavingId(id)
    return api
      .patch(`/teacher/sessions/${id}`, data)
      .then(load)
      .catch((err) => setError(err.message))
      .finally(() => setSavingId(null))
  }

  const handleManualAttendance = (id, manualReason) => {
    setSavingId(id)
    return api
      .post('/teacher/attendance/manual', { sessionId: id, manualReason })
      .then(() => {
        setAutoReportIds((prev) => new Set(prev).add(id))
        return load()
      })
      .catch((err) => setError(err.message))
      .finally(() => setSavingId(null))
  }

  const handleCreateForStudent = (studentId, form) => {
    setSavingId('create')
    setError(null)
    return api
      .post('/teacher/sessions', { ...form, studentId })
      .then(() => {
        setCreatingForStudentId(null)
        return load()
      })
      .catch((err) => {
        setError(err.message)
        throw err
      })
      .finally(() => setSavingId(null))
  }

  if (error && !sessions) {
    return <p className="text-red-600">{error}</p>
  }

  if (!sessions || !students) {
    return <Spinner />
  }

  const sessionsByStudent = new Map(students.map((s) => [s.id, []]))
  for (const session of sessions) {
    sessionsByStudent.get(session.studentId)?.push(session)
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-2xl font-bold text-navy">Planning</h1>
        <div className="inline-flex rounded-full bg-gray-100 p-1 text-sm">
          {[
            ['calendrier', 'Calendrier'],
            ['eleves', 'Par élève'],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setView(key)}
              className={`rounded-full px-4 py-1.5 font-medium transition-colors ${
                view === key ? 'bg-white text-navy shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="mb-4 text-red-600">{error}</p>}

      {students.length === 0 ? (
        <p className="text-sm text-gray-500">Aucun élève assigné pour l'instant.</p>
      ) : view === 'calendrier' ? (
        <PlanningCalendar
          sessions={sessions}
          renderSession={(session) => (
            <SessionRow
              session={session}
              savingId={savingId}
              onCancelSession={handleCancelSession}
              onSaveReport={handleSaveReport}
              onManualAttendance={handleManualAttendance}
              autoOpenReport={autoReportIds.has(session.id)}
            />
          )}
        />
      ) : (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(380px,1fr))] gap-4">
          {students.map((student) => (
            <StudentPlanningCard
              key={student.id}
              student={student}
              sessions={sessionsByStudent.get(student.id) ?? []}
              savingId={savingId}
              creating={creatingForStudentId}
              onOpenCreate={setCreatingForStudentId}
              onCloseCreate={() => setCreatingForStudentId(null)}
              onSubmitCreate={handleCreateForStudent}
              onCancelSession={handleCancelSession}
              onSaveReport={handleSaveReport}
              onManualAttendance={handleManualAttendance}
              autoReportIds={autoReportIds}
            />
          ))}
        </div>
      )}
    </div>
  )
}
