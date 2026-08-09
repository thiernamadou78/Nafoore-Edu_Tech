import { useEffect, useState } from 'react'
import { CalendarPlus, Check, X } from 'lucide-react'
import { api } from '../lib/api'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Spinner } from '../components/ui/Spinner'
import { SESSION_STATUS_LABELS, SESSION_STATUS_TONES } from './labels'

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy'

const EMPTY_CREATE_FORM = { studentId: '', subject: '', date: '', durationMinutes: 60 }

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
  const dateLabel = start.toLocaleDateString('fr-FR', { dateStyle: 'medium' })
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
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={3}
        placeholder="Ce qui a été travaillé, points à retravailler…"
        className={`${inputClass} resize-none`}
      />
      <div className="flex gap-2">
        <Button
          disabled={saving}
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
          disabled={saving || !reason.trim()}
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

function SessionRow({ session, onCancelSession, onSaveReport, savingId }) {
  const [reportOpen, setReportOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const hasReport = session.status === 'realisee' && (session.notes || session.attended !== null)
  const isPast = new Date(session.date) < new Date()

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium text-gray-900">{session.studentName}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-600">
            {session.subject && <Badge tone="gold">{session.subject}</Badge>}
            <span>{formatTimeRange(session.date, session.durationMinutes)}</span>
            <Badge tone={SESSION_STATUS_TONES[session.status] ?? 'gray'}>
              {SESSION_STATUS_LABELS[session.status] ?? session.status}
            </Badge>
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
        </div>
      </div>

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
    </Card>
  )
}

export function Planning() {
  const [sessions, setSessions] = useState(null)
  const [students, setStudents] = useState(null)
  const [error, setError] = useState(null)
  const [savingId, setSavingId] = useState(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createForm, setCreateForm] = useState(EMPTY_CREATE_FORM)
  const [creating, setCreating] = useState(false)

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

  const handleCreate = (e) => {
    e.preventDefault()
    setCreating(true)
    setError(null)
    api
      .post('/teacher/sessions', createForm)
      .then(() => {
        setCreateForm(EMPTY_CREATE_FORM)
        setShowCreateForm(false)
        return load()
      })
      .catch((err) => setError(err.message))
      .finally(() => setCreating(false))
  }

  if (error && !sessions) {
    return <p className="text-red-600">{error}</p>
  }

  if (!sessions || !students) {
    return <Spinner />
  }

  const now = new Date()
  const upcoming = sessions
    .filter((s) => new Date(s.date) >= now && s.status !== 'annulee')
    .sort((a, b) => new Date(a.date) - new Date(b.date))
  const past = sessions
    .filter((s) => new Date(s.date) < now || s.status === 'annulee')
    .sort((a, b) => new Date(b.date) - new Date(a.date))

  const selectedStudent = students.find((s) => s.id === createForm.studentId)

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold text-navy">Planning</h1>
        <Button icon={CalendarPlus} onClick={() => setShowCreateForm((v) => !v)}>
          Planifier une séance
        </Button>
      </div>

      {error && <p className="mb-4 text-red-600">{error}</p>}

      {showCreateForm && (
        <Card className="mb-6 p-5">
          <form onSubmit={handleCreate} className="grid gap-3 sm:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Élève</label>
              <select
                required
                value={createForm.studentId}
                onChange={(e) =>
                  setCreateForm({
                    ...createForm,
                    studentId: e.target.value,
                    subject: '',
                  })
                }
                className={inputClass}
              >
                <option value="">Choisir…</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Matière</label>
              <select
                required
                disabled={!selectedStudent}
                value={createForm.subject}
                onChange={(e) => setCreateForm({ ...createForm, subject: e.target.value })}
                className={inputClass}
              >
                <option value="">Choisir…</option>
                {selectedStudent?.subjects.map((subject) => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Date et heure</label>
              <input
                required
                type="datetime-local"
                value={createForm.date}
                onChange={(e) => setCreateForm({ ...createForm, date: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Durée</label>
              <select
                value={createForm.durationMinutes}
                onChange={(e) =>
                  setCreateForm({ ...createForm, durationMinutes: Number(e.target.value) })
                }
                className={inputClass}
              >
                {DURATION_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-4">
              <Button type="submit" disabled={creating}>
                Planifier
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="space-y-8">
        <div>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">
            À venir
          </h2>
          {upcoming.length === 0 ? (
            <p className="text-sm text-gray-500">Aucune séance planifiée.</p>
          ) : (
            <div className="space-y-3">
              {upcoming.map((session) => (
                <SessionRow
                  key={session.id}
                  session={session}
                  savingId={savingId}
                  onCancelSession={handleCancelSession}
                  onSaveReport={handleSaveReport}
                />
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">
            Passées
          </h2>
          {past.length === 0 ? (
            <p className="text-sm text-gray-500">Aucune séance passée.</p>
          ) : (
            <div className="space-y-3">
              {past.map((session) => (
                <SessionRow
                  key={session.id}
                  session={session}
                  savingId={savingId}
                  onCancelSession={handleCancelSession}
                  onSaveReport={handleSaveReport}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
