import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Atom,
  BookOpen,
  CalendarClock,
  Calculator,
  CheckCircle2,
  Dumbbell,
  Globe2,
  Palette,
  Plus,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Users,
  X,
  XCircle,
} from 'lucide-react'
import { api } from '../lib/api'
import { useAutoRefresh } from '../lib/useAutoRefresh'
import { formatDateTime } from '../lib/format'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { Spinner } from '../components/ui/Spinner'
import { SessionsTimeline } from '../components/SessionsTimeline'
import { ProgressCard } from '../components/ProgressCard'
import { SessionReport } from '../components/SessionReport'
import { PassEducatifCard } from './PassEducatifCard'
import { DAYS_OF_WEEK, FREQUENCY_OPTIONS, SUBJECTS_BY_LEVEL } from './curriculum'
import {
  LEVEL_LABELS,
  PROGRESS_ENTRY_LABELS,
  PROGRESS_ENTRY_TONES,
  TEACHER_REQUEST_FORMAT_LABELS,
  TEACHER_REQUEST_STATUS_LABELS,
  TEACHER_REQUEST_STATUS_TONES,
} from './labels'

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy'

const ACTIVE_REQUEST_STATUSES = ['en_attente', 'proposition_envoyee']

const DAY_LABELS = {
  1: 'Lundi',
  2: 'Mardi',
  3: 'Mercredi',
  4: 'Jeudi',
  5: 'Vendredi',
  6: 'Samedi',
  7: 'Dimanche',
}

// Même logique que côté enseignant/admin : la durée cumulée ne compte que les
// séances confirmées comme réalisées (jamais les planifiées ou annulées).
function formatMinutes(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = Math.round(totalMinutes % 60)
  if (hours === 0) return `${minutes} min`
  if (minutes === 0) return `${hours} h`
  return `${hours} h ${String(minutes).padStart(2, '0')} min`
}

function getInitials(name) {
  const parts = name.trim().split(/\s+/)
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
}

function subjectIcon(subject = '') {
  const s = subject.toLowerCase()
  if (s.includes('math')) return Calculator
  if (s.includes('physique') || s.includes('svt') || s.includes('science')) return Atom
  if (s.includes('histoire') || s.includes('géo') || s.includes('ses')) return Globe2
  if (s.includes('sport') || s.includes('eps')) return Dumbbell
  if (s.includes('art') || s.includes('musique')) return Palette
  return BookOpen
}

export function StudentDetail() {
  const { id } = useParams()
  const [student, setStudent] = useState(null)
  const [error, setError] = useState(null)

  const now = Date.now()
  const sessions = student?.sessions ?? []
  const nextSession = [...sessions]
    .filter((s) => new Date(s.date).getTime() >= now && s.status !== 'annulee')
    .sort((a, b) => new Date(a.date) - new Date(b.date))[0]

  const load = useCallback(() => {
    return api
      .get(`/family/students/${id}`)
      .then(setStudent)
      .catch((err) => setError(err.message))
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  useAutoRefresh(() => {
    api
      .get(`/family/students/${id}`)
      .then(setStudent)
      .catch(() => {})
  })

  useEffect(() => {
    // Pas de temps réel : on rafraîchit dès que l'onglet redevient actif, pour
    // remonter les séances/statuts que le prof ou l'admin viennent de changer
    // ailleurs sans que la famille ait à recharger la page manuellement.
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') load()
    }
    window.addEventListener('focus', load)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      window.removeEventListener('focus', load)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [load])

  if (error) {
    return <p className="text-red-600">{error}</p>
  }

  if (!student) {
    return <Spinner />
  }

  const teacherName = student.teachers[0]?.teacher.name ?? null
  const totalMinutesRealized = student.sessions
    .filter((s) => s.status === 'realisee' && s.attendanceLogs?.length > 0)
    .reduce((sum, s) => sum + (s.durationMinutes ?? 0), 0)
  const activeRequests = student.teacherRequests.filter((r) =>
    ACTIVE_REQUEST_STATUSES.includes(r.status),
  )
  const tagLine = [LEVEL_LABELS[student.level] ?? student.level, student.school, student.address]
    .filter(Boolean)
    .join(' · ')

  return (
    <div>
      <Link
        to="/"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-navy hover:underline"
      >
        <ArrowLeft size={14} />
        Retour
      </Link>

      {/* En-tête élève */}
      <div className="mb-6 flex items-center gap-4">
        <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-navy font-medium text-gold-400">
          {student.photoUrl ? (
            <img src={student.photoUrl} alt={student.name} className="h-full w-full object-cover" />
          ) : (
            getInitials(student.name)
          )}
        </div>
        <div>
          <h1 className="font-serif text-xl font-bold text-navy">{student.name}</h1>
          {tagLine && <p className="mt-0.5 text-[13px] text-gray-500">{tagLine}</p>}
        </div>
      </div>

      {/* Bande d'infos compacte */}
      <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm">
        <div className="flex items-center gap-2">
          <CalendarClock size={16} className="shrink-0 text-gray-400" />
          <span className="text-gray-500">Prochaine séance</span>
          {nextSession ? (
            <span className="font-medium text-gray-800">
              {formatDateTime(nextSession.date)}
              {nextSession.subject ? ` · ${nextSession.subject}` : ''}
            </span>
          ) : (
            <span className="text-gray-400">Aucune séance planifiée</span>
          )}
        </div>
        <div className="hidden h-5 w-px bg-gray-200 sm:block" />
        <div className="flex items-center gap-2">
          <Users size={16} className="shrink-0 text-gray-400" />
          <span className="text-gray-500">Enseignant</span>
          {teacherName ? (
            <span className="font-medium text-gray-800">{teacherName}</span>
          ) : (
            <span className="text-gray-400">Aucun enseignant assigné</span>
          )}
        </div>
        <div className="hidden h-5 w-px bg-gray-200 sm:block" />
        <div className="flex items-center gap-2">
          <CheckCircle2 size={16} className="shrink-0 text-gray-400" />
          <span className="text-gray-500">Heures cumulées</span>
          <span className="font-medium text-gray-800">{formatMinutes(totalMinutesRealized)}</span>
        </div>
      </div>

      {/* Pass éducatif */}
      <div className="mb-6">
        <PassEducatifCard student={student} />
      </div>

      <AssignmentsSection student={student} onChanged={load} />

      {/* Demande de professeur */}
      <TeacherRequestsSection
        student={student}
        activeRequests={activeRequests}
        onChanged={load}
      />

      {/* Programme */}
      {student.recurringSchedules?.length > 0 && (
        <Card className="mb-6 p-5">
          <h2 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
            <CalendarClock size={16} className="text-gold-500" />
            Programme
          </h2>
          <div className="space-y-4">
            {student.recurringSchedules.map((schedule) => (
              <div key={schedule.id}>
                <p className="mb-1.5 text-sm text-gray-700">
                  <span className="font-medium text-gray-900">{schedule.teacher.name}</span> —{' '}
                  {schedule.frequency} séance{schedule.frequency > 1 ? 's' : ''} par semaine
                  {schedule.subject && ` · ${schedule.subject}`}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {[...schedule.slots]
                    .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
                    .map((slot, i) => (
                      <Badge key={i} tone="gold">
                        {DAY_LABELS[slot.dayOfWeek]} {slot.time}
                      </Badge>
                    ))}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-gray-400">
            Pour modifier ce planning, contacte l'enseignant via la messagerie.
          </p>
        </Card>
      )}

      {/* Seances et comptes-rendus, lus ligne par ligne (a venir puis historique) */}
      <Card className="mb-6 p-5">
        <h2 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
          <Sparkles size={16} className="text-gold-500" />
          Séances et comptes-rendus
        </h2>
        <SessionsTimeline
          sessions={sessions}
          onSessionChanged={(updated) =>
            setStudent((current) => ({
              ...current,
              sessions: current.sessions.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)),
            }))
          }
        />
      </Card>

      <ProgressCard studentId={student.id} />

    </div>
  )
}

function AssignmentsSection({ student, onChanged }) {
  const assignments = (student.teachers ?? []).filter((row) => row.endsAt)
  const [renewing, setRenewing] = useState(null)
  const [months, setMonths] = useState(1)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  if (assignments.length === 0) return null

  const submitRenewal = async (assignmentId) => {
    setBusy(true)
    setError(null)
    try {
      await api.post(`/family/student-teachers/${assignmentId}/renewal`, { periodMonths: months })
      setRenewing(null)
      await onChanged()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="mb-6 p-5">
      <h2 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
        <CalendarClock size={16} className="text-gold-500" />
        Accompagnement en cours
      </h2>
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      <div className="space-y-3">
        {assignments.map((row) => {
          const endsAt = new Date(row.endsAt)
          const daysLeft = Math.ceil((endsAt.getTime() - Date.now()) / 86_400_000)
          const renewal = row.renewals?.[0]
          const open = renewal && RENEWAL_OPEN_STATUSES.includes(renewal.status)
          const canRenew = daysLeft <= RENEWAL_WINDOW_DAYS && !open
          return (
            <div key={row.id} className="rounded-lg border border-gray-100 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {row.teacher.name}
                    {row.subject ? ` · ${row.subject}` : ''}
                  </p>
                  <p className="text-xs text-gray-500">
                    {daysLeft >= 0
                      ? `Fin de la période le ${endsAt.toLocaleDateString('fr-FR')} (dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''})`
                      : `Période terminée le ${endsAt.toLocaleDateString('fr-FR')}`}
                  </p>
                </div>
                {canRenew && renewing !== row.id && (
                  <Button variant="secondary" onClick={() => setRenewing(row.id)}>
                    Renouveler
                  </Button>
                )}
              </div>
              {renewal && (
                <p className="mt-2 text-xs text-gray-600">
                  {RENEWAL_STATUS_LABELS[renewal.status] ?? renewal.status}
                  {renewal.status === 'en_attente_prof' || renewal.status === 'acceptee_prof'
                    ? ` (${renewal.periodMonths} mois)`
                    : ''}
                </p>
              )}
              {renewing === row.id && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <select
                    value={months}
                    onChange={(e) => setMonths(Number(e.target.value))}
                    className={inputClass}
                    style={{ width: 'auto' }}
                  >
                    {PERIOD_OPTIONS.map((m) => (
                      <option key={m} value={m}>
                        Renouveler pour {m} mois
                      </option>
                    ))}
                  </select>
                  <Button loading={busy} onClick={() => submitRenewal(row.id)}>
                    Envoyer la demande
                  </Button>
                  <Button variant="secondary" disabled={busy} onClick={() => setRenewing(null)}>
                    Annuler
                  </Button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function TeacherRequestsSection({ student, activeRequests, onChanged }) {
  const [showForm, setShowForm] = useState(false)

  return (
    <Card className="mb-6 p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-semibold text-gray-900">
          <UserPlus size={16} className="text-gold-500" />
          Demande de professeur
        </h2>
        <Button variant="secondary" icon={Plus} onClick={() => setShowForm((v) => !v)}>
          Nouvelle demande
        </Button>
      </div>

      {activeRequests.length > 0 && (
        <div className="mb-4 space-y-3">
          {activeRequests.map((request) => (
            <TeacherRequestRow
              key={request.id}
              request={request}
              studentId={student.id}
              level={student.level}
              onChanged={onChanged}
            />
          ))}
        </div>
      )}

      {showForm && (
        <TeacherRequestForm
          studentId={student.id}
          level={student.level}
          onCreated={async () => {
            await onChanged()
            setShowForm(false)
          }}
        />
      )}
    </Card>
  )
}

function TeacherRequestRow({ request, studentId, level, onChanged }) {
  const [editing, setEditing] = useState(false)
  const [confirmingCancel, setConfirmingCancel] = useState(false)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState(null)

  const cancelRequest = async () => {
    setBusy(true)
    setActionError(null)
    try {
      await api.patch(`/family/teacher-requests/${request.id}/cancel`, {})
      await onChanged()
    } catch (err) {
      setActionError(err.message)
      setBusy(false)
    }
  }

  // Plusieurs profs peuvent être proposés pour une même demande : on les
  // empile toutes, la famille choisit celle qui lui convient.
  const pendingProposals = request.matchings.filter((m) => m.status === 'proposee')
  const Icon = subjectIcon(request.subject)

  return (
    <div className="rounded-lg border border-gray-100 p-3">
      <div className="flex items-center gap-3">
        <Icon size={16} className="shrink-0 text-gray-400" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-800">{request.subject}</p>
          <p className="truncate text-xs text-gray-500">
            {TEACHER_REQUEST_FORMAT_LABELS[request.format] ?? request.format} · {request.frequency}
          </p>
        </div>
        <Badge tone={TEACHER_REQUEST_STATUS_TONES[request.status]}>
          {TEACHER_REQUEST_STATUS_LABELS[request.status] ?? request.status}
        </Badge>
      </div>

      {actionError && <p className="mt-2 text-xs text-red-600">{actionError}</p>}

      {editing ? (
        <div className="mt-3">
          <TeacherRequestForm
            studentId={studentId}
            level={level}
            request={request}
            onCancel={() => setEditing(false)}
            onCreated={async () => {
              await onChanged()
              setEditing(false)
            }}
          />
        </div>
      ) : confirmingCancel ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-800">
          <span className="mr-auto">
            Annuler cette demande ?
            {pendingProposals.length > 0 && ' Les professeurs proposés en seront informés.'}
          </span>
          <Button variant="danger" loading={busy} onClick={cancelRequest}>
            Oui, annuler
          </Button>
          <Button variant="secondary" disabled={busy} onClick={() => setConfirmingCancel(false)}>
            Non
          </Button>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {request.status === 'en_attente' && (
            <Button variant="secondary" onClick={() => setEditing(true)}>
              Modifier
            </Button>
          )}
          <Button variant="secondary" onClick={() => setConfirmingCancel(true)}>
            Annuler la demande
          </Button>
          {request.status === 'proposition_envoyee' && (
            <span className="text-xs text-gray-500">
              Pour modifier la demande, réponds d'abord à la proposition ou annule-la.
            </span>
          )}
        </div>
      )}

      {pendingProposals.length > 0 && (
        <div className="mt-3 space-y-3">
          {pendingProposals.map((matching) => (
            <MatchingProposalCard key={matching.id} matching={matching} onChanged={onChanged} />
          ))}
        </div>
      )}
    </div>
  )
}

function MatchingProposalCard({ matching, onChanged }) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [refusing, setRefusing] = useState(false)
  const [reason, setReason] = useState('')
  const { teacher } = matching

  const respond = async (action) => {
    if (action === 'refuse' && reason.trim().length < 3) {
      setError('Indique le motif de ton refus (3 caractères minimum).')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await api.patch(
        `/family/matchings/${matching.id}/${action}`,
        action === 'refuse' ? { refusalReason: reason.trim() } : {},
      )
      await onChanged()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="rounded-lg border-l-4 border-l-gold-400 bg-gold-400/10 p-3">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-navy/10 text-navy">
          {teacher.photoUrl ? (
            <img src={teacher.photoUrl} alt={teacher.name} className="h-full w-full object-cover" />
          ) : (
            getInitials(teacher.name)
          )}
        </div>
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-medium text-gray-900">
            {teacher.name}
            {teacher.verified && <ShieldCheck size={14} className="text-leaf-700" />}
          </p>
          {teacher.subjects.length > 0 && (
            <p className="truncate text-xs text-gray-500">{teacher.subjects.join(', ')}</p>
          )}
        </div>
      </div>
      {teacher.bio && <p className="mt-2 text-xs text-gray-600">{teacher.bio}</p>}
      {(teacher.postalCode || teacher.city) && (
        <p className="mt-1 text-xs text-gray-400">
          {teacher.postalCode && <>Code postal : {teacher.postalCode}</>}
          {teacher.postalCode && teacher.city && ' · '}
          {teacher.city && <>Ville : {teacher.city}</>}
        </p>
      )}

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      {refusing && (
        <div className="mt-3">
          <label className="mb-1 block text-xs font-medium text-gray-700">
            Motif du refus <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            placeholder="Ex : trop éloigné, disponibilités qui ne correspondent pas…"
            className={inputClass}
          />
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {!refusing && (
          <Button
            variant="success"
            icon={CheckCircle2}
            loading={submitting}
            onClick={() => respond('accept')}
          >
            Accepter
          </Button>
        )}
        {refusing ? (
          <>
            <Button
              variant="secondary"
              icon={XCircle}
              loading={submitting}
              onClick={() => respond('refuse')}
            >
              Confirmer le refus
            </Button>
            <Button
              variant="secondary"
              disabled={submitting}
              onClick={() => {
                setRefusing(false)
                setError(null)
              }}
            >
              Annuler
            </Button>
          </>
        ) : (
          <Button
            variant="secondary"
            icon={XCircle}
            disabled={submitting}
            onClick={() => setRefusing(true)}
          >
            Refuser
          </Button>
        )}
      </div>
    </div>
  )
}

const DEFAULT_REQUEST_FORM = {
  subjects: [],
  frequency: '',
  durationMinutes: '',
  periodMonths: '',
  desiredStartDate: '',
  format: 'presentiel',
  availabilityDays: [],
  timeSlots: [],
}

// Liste fermee (pas de saisie libre) : des horaires en texte libre seraient
// impossibles a exploiter de facon fiable pour un futur filtrage/matching.
const TIME_SLOTS = [
  'Matin (8h-12h)',
  'Après-midi (12h-16h)',
  "Sortie d'école (16h-18h)",
  'Soirée (18h-20h)',
]

const DURATION_OPTIONS = [30, 45, 60, 90, 120]

// Objectif de duree (renouvelable) : 1, 2, 3 ou 6 mois.
const PERIOD_OPTIONS = [1, 2, 3, 6, 9]

const RENEWAL_STATUS_LABELS = {
  en_attente_prof: "En attente de la réponse de l'enseignant",
  acceptee_prof: "Accepté par l'enseignant — confirmation par l'équipe en cours",
  refusee_prof: "L'enseignant ne peut pas poursuivre — une nouvelle demande a été ouverte",
  confirmee: 'Renouvelé',
  refusee_admin: 'Renouvellement refusé',
}
const RENEWAL_OPEN_STATUSES = ['en_attente_prof', 'acceptee_prof']
const RENEWAL_WINDOW_DAYS = 14

// Recherche-au-clic plutôt que grille de pastilles : plus lisible dès que la
// liste de matières s'allonge, et permet d'ajouter une matière absente de la
// liste proposée.
function SubjectPicker({ selected, onChange, availableSubjects }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const inputRef = useRef(null)

  const normalizedQuery = query.trim().toLowerCase()
  const filtered = availableSubjects.filter(
    (s) => !selected.includes(s) && s.toLowerCase().startsWith(normalizedQuery),
  )
  const isKnownSubject = availableSubjects.some((s) => s.toLowerCase() === normalizedQuery)
  const isAlreadySelected = selected.some((s) => s.toLowerCase() === normalizedQuery)
  const canCreate = normalizedQuery.length > 0 && !isKnownSubject && !isAlreadySelected

  const addSubject = (subject) => {
    if (!selected.includes(subject)) onChange([...selected, subject])
    setQuery('')
    setOpen(false)
  }

  const removeSubject = (subject) => {
    onChange(selected.filter((s) => s !== subject))
  }

  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-gray-700">
        Matière{selected.length > 1 ? 's' : ''}
      </p>
      {selected.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {selected.map((subject) => (
            <span
              key={subject}
              className="inline-flex items-center gap-1 rounded-full bg-navy/10 px-2.5 py-1 text-xs font-medium text-navy"
            >
              {subject}
              <button
                type="button"
                onClick={() => removeSubject(subject)}
                className="rounded-full hover:opacity-70"
                aria-label={`Retirer ${subject}`}
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return
            e.preventDefault()
            if (filtered.length === 1) addSubject(filtered[0])
            else if (canCreate) addSubject(query.trim())
          }}
          placeholder="Rechercher (ex : M pour Mathématiques)…"
          className={inputClass}
        />
        {open && (filtered.length > 0 || canCreate) && (
          <div
            onMouseDown={(e) => e.preventDefault()}
            className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg"
          >
            {filtered.map((subject) => (
              <button
                key={subject}
                type="button"
                onClick={() => addSubject(subject)}
                className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
              >
                {subject}
              </button>
            ))}
            {canCreate && (
              <button
                type="button"
                onClick={() => addSubject(query.trim())}
                className="block w-full border-t border-gray-100 px-3 py-2 text-left text-sm font-medium text-navy hover:bg-gold-400/10"
              >
                + Créer « {query.trim()} »
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// availability est stocke "jours · creneaux" ; on retrouve les listes fermees
// par appartenance plutot que par position (un des deux peut etre vide).
function formFromRequest(request) {
  const tokens = (request.availability ?? '').split(/ · |, /)
  return {
    subjects: [request.subject],
    frequency: request.frequency ?? '',
    durationMinutes: request.durationMinutes ?? '',
    periodMonths: request.periodMonths ?? '',
    desiredStartDate: request.desiredStartDate ? request.desiredStartDate.slice(0, 10) : '',
    format: request.format,
    availabilityDays: tokens.filter((t) => DAYS_OF_WEEK.includes(t)),
    timeSlots: tokens.filter((t) => TIME_SLOTS.includes(t)),
  }
}

function TeacherRequestForm({ studentId, level, request, onCreated, onCancel }) {
  const [form, setForm] = useState(() => (request ? formFromRequest(request) : DEFAULT_REQUEST_FORM))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const subjects = SUBJECTS_BY_LEVEL[level] ?? []

  const toggleDay = (day) => {
    setForm((f) => ({
      ...f,
      availabilityDays: f.availabilityDays.includes(day)
        ? f.availabilityDays.filter((d) => d !== day)
        : [...f.availabilityDays, day],
    }))
  }

  const toggleTimeSlot = (slot) => {
    setForm((f) => ({
      ...f,
      timeSlots: f.timeSlots.includes(slot)
        ? f.timeSlots.filter((s) => s !== slot)
        : [...f.timeSlots, slot],
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (request) {
      setSubmitting(true)
      setError(null)
      try {
        await api.patch(`/family/teacher-requests/${request.id}`, {
          frequency: form.frequency,
          format: form.format,
          durationMinutes: form.durationMinutes || undefined,
          periodMonths: form.periodMonths || undefined,
          desiredStartDate: form.desiredStartDate || undefined,
          availability: [form.availabilityDays.join(', '), form.timeSlots.join(', ')]
            .filter(Boolean)
            .join(' · '),
        })
        await onCreated()
      } catch (err) {
        setError(err.message)
      } finally {
        setSubmitting(false)
      }
      return
    }
    if (form.subjects.length === 0) {
      setError('Choisis au moins une matière.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const { subjects: chosenSubjects, availabilityDays, timeSlots, durationMinutes, desiredStartDate, periodMonths, ...rest } = form
      // Une demande par matière : chacune suit ensuite son propre statut et
      // matching (un prof peut être proposé pour Maths sans l'être pour Anglais).
      const availability = [availabilityDays.join(', '), timeSlots.join(', ')]
        .filter(Boolean)
        .join(' · ')
      await Promise.all(
        chosenSubjects.map((subject) =>
          api.post(`/family/students/${studentId}/teacher-requests`, {
            ...rest,
            subject,
            durationMinutes: durationMinutes || undefined,
            periodMonths: Number(periodMonths),
            desiredStartDate: form.desiredStartDate || undefined,
            availability,
          }),
        ),
      )
      setForm(DEFAULT_REQUEST_FORM)
      await onCreated()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 border-t border-gray-100 pt-4">
      {error && <p className="text-sm text-red-600">{error}</p>}
      {request ? (
        <p className="text-sm font-medium text-gray-800">Modifier la demande : {request.subject}</p>
      ) : (
        <SubjectPicker
          selected={form.subjects}
          onChange={(nextSubjects) => setForm((f) => ({ ...f, subjects: nextSubjects }))}
          availableSubjects={subjects}
        />
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <select
          required
          value={form.frequency}
          onChange={(e) => setForm({ ...form, frequency: e.target.value })}
          className={inputClass}
        >
          <option value="" disabled>
            Fréquence souhaitée
          </option>
          {FREQUENCY_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <select
          required
          value={form.durationMinutes}
          onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })}
          className={inputClass}
        >
          <option value="" disabled>
            Durée de séance souhaitée
          </option>
          {DURATION_OPTIONS.map((minutes) => (
            <option key={minutes} value={minutes}>
              {minutes} min
            </option>
          ))}
        </select>
      </div>
      <select
        required
        value={form.periodMonths}
        onChange={(e) => setForm({ ...form, periodMonths: Number(e.target.value) })}
        className={inputClass}
      >
        <option value="" disabled>
          Durée de l'accompagnement souhaitée
        </option>
        {PERIOD_OPTIONS.map((months) => (
          <option key={months} value={months}>
            {months} mois
          </option>
        ))}
      </select>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-700">
          Date de début souhaitée (facultatif)
        </label>
        <input
          type="date"
          min={new Date().toISOString().slice(0, 10)}
          value={form.desiredStartDate}
          onChange={(e) => setForm({ ...form, desiredStartDate: e.target.value })}
          className={inputClass}
        />
      </div>
      <div className="flex gap-4 text-sm text-gray-700">
        <label className="flex items-center gap-1.5">
          <input
            type="radio"
            checked={form.format === 'presentiel'}
            onChange={() => setForm({ ...form, format: 'presentiel' })}
          />
          Présentiel
        </label>
        <label className="flex items-center gap-1.5">
          <input
            type="radio"
            checked={form.format === 'distanciel'}
            onChange={() => setForm({ ...form, format: 'distanciel' })}
          />
          Distanciel
        </label>
        <label className="flex items-center gap-1.5">
          <input
            type="radio"
            checked={form.format === 'hybride'}
            onChange={() => setForm({ ...form, format: 'hybride' })}
          />
          Hybride
        </label>
      </div>
      <div>
        <p className="mb-1.5 text-sm font-medium text-gray-700">Disponibilités</p>
        <div className="flex flex-wrap gap-2">
          {DAYS_OF_WEEK.map((day) => {
            const active = form.availabilityDays.includes(day)
            return (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  active
                    ? 'border-navy bg-navy text-white'
                    : 'border-gray-300 text-gray-600 hover:border-navy/40'
                }`}
              >
                {day}
              </button>
            )
          })}
        </div>
      </div>
      <div>
        <p className="mb-1.5 text-sm font-medium text-gray-700">
          Créneau horaire souhaité (optionnel)
        </p>
        <div className="flex flex-wrap gap-2">
          {TIME_SLOTS.map((slot) => {
            const active = form.timeSlots.includes(slot)
            return (
              <button
                key={slot}
                type="button"
                onClick={() => toggleTimeSlot(slot)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  active
                    ? 'border-navy bg-navy text-white'
                    : 'border-gray-300 text-gray-600 hover:border-navy/40'
                }`}
              >
                {slot}
              </button>
            )
          })}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" icon={UserPlus} loading={submitting}>
          {submitting ? 'Envoi…' : request ? 'Enregistrer les modifications' : 'Envoyer la demande'}
        </Button>
        {request && (
          <Button type="button" variant="secondary" disabled={submitting} onClick={onCancel}>
            Annuler
          </Button>
        )}
      </div>
    </form>
  )
}
