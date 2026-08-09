import { useCallback, useEffect, useState } from 'react'
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
  XCircle,
} from 'lucide-react'
import { api } from '../lib/api'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { Spinner } from '../components/ui/Spinner'
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

  const load = useCallback(() => {
    return api
      .get(`/family/students/${id}`)
      .then(setStudent)
      .catch((err) => setError(err.message))
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  if (error) {
    return <p className="text-red-600">{error}</p>
  }

  if (!student) {
    return <Spinner />
  }

  const now = Date.now()
  const nextSession = [...student.sessions]
    .filter((s) => new Date(s.date).getTime() >= now && s.status !== 'annulee')
    .sort((a, b) => new Date(a.date) - new Date(b.date))[0]
  const teacherName = student.teachers[0]?.teacher.name ?? null
  const pastSessions = student.sessions.filter((s) => s.id !== nextSession?.id)
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
              {new Date(nextSession.date).toLocaleString('fr-FR', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
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
      </div>

      {/* Demande de professeur */}
      <TeacherRequestsSection
        student={student}
        activeRequests={activeRequests}
        onChanged={load}
      />

      {/* Progression */}
      <Card className="mb-6 p-5">
        <h2 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
          <Sparkles size={16} className="text-gold-500" />
          Progression
        </h2>
        {student.progressEntries.length > 0 ? (
          <ul className="divide-y divide-gray-100">
            {student.progressEntries.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between py-2.5 text-sm">
                <span className="text-gray-800">{entry.subject}</span>
                <Badge tone={PROGRESS_ENTRY_TONES[entry.status]}>
                  {PROGRESS_ENTRY_LABELS[entry.status] ?? entry.status}
                </Badge>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={Sparkles}
            title="Pas encore de bilan partagé"
            description="Les bilans de progression apparaîtront ici dès qu'ils seront disponibles."
          />
        )}
      </Card>

      {/* Historique des séances */}
      <Card className="p-5">
        <h2 className="mb-3 font-semibold text-gray-900">Historique des séances</h2>
        {pastSessions.length > 0 ? (
          <ul className="divide-y divide-gray-100">
            {pastSessions.map((session) => (
              <li key={session.id} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <p className="text-gray-800">
                    {new Date(session.date).toLocaleString('fr-FR', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                    {session.subject ? ` · ${session.subject}` : ''}
                  </p>
                  {session.teacher && <p className="text-xs text-gray-400">{session.teacher.name}</p>}
                </div>
                {session.attended === true && <Badge tone="leaf">Présent</Badge>}
                {session.attended === false && <Badge tone="clay">Absent</Badge>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">Aucune séance pour l'instant.</p>
        )}
      </Card>
    </div>
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
            <TeacherRequestRow key={request.id} request={request} onChanged={onChanged} />
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

function TeacherRequestRow({ request, onChanged }) {
  const pending = request.matchings.find((m) => m.status === 'proposee')
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

      {pending && <MatchingProposalCard matching={pending} onChanged={onChanged} />}
    </div>
  )
}

function MatchingProposalCard({ matching, onChanged }) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const { teacher } = matching

  const respond = async (action) => {
    setSubmitting(true)
    setError(null)
    try {
      await api.patch(`/family/matchings/${matching.id}/${action}`, {})
      await onChanged()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mt-3 rounded-lg border-l-4 border-l-gold-400 bg-gold-400/10 p-3">
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
      {teacher.zone && <p className="mt-1 text-xs text-gray-400">Zone : {teacher.zone}</p>}

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      <div className="mt-3 flex gap-2">
        <Button
          variant="success"
          icon={CheckCircle2}
          disabled={submitting}
          onClick={() => respond('accept')}
        >
          Accepter
        </Button>
        <Button
          variant="secondary"
          icon={XCircle}
          disabled={submitting}
          onClick={() => respond('refuse')}
        >
          Refuser
        </Button>
      </div>
    </div>
  )
}

const DEFAULT_REQUEST_FORM = {
  subject: '',
  frequency: '',
  format: 'presentiel',
  availabilityDays: [],
}

function TeacherRequestForm({ studentId, level, onCreated }) {
  const [form, setForm] = useState(DEFAULT_REQUEST_FORM)
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

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const { availabilityDays, ...rest } = form
      await api.post(`/family/students/${studentId}/teacher-requests`, {
        ...rest,
        availability: availabilityDays.join(', '),
      })
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
      <div className="grid gap-3 sm:grid-cols-2">
        <select
          required
          value={form.subject}
          onChange={(e) => setForm({ ...form, subject: e.target.value })}
          className={inputClass}
        >
          <option value="" disabled>
            Choisir une matière
          </option>
          {subjects.map((subject) => (
            <option key={subject} value={subject}>
              {subject}
            </option>
          ))}
        </select>
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
      <Button type="submit" icon={UserPlus} disabled={submitting}>
        {submitting ? 'Envoi…' : 'Envoyer la demande'}
      </Button>
    </form>
  )
}
