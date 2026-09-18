import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarClock, GraduationCap, UserPlus } from 'lucide-react'
import { api } from '../lib/api'
import { useStudents } from '../context/StudentsContext'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { Spinner } from '../components/ui/Spinner'
import { SessionsBoard } from '../components/SessionsBoard'
import { PlanningCalendar } from '../components/PlanningCalendar'
import { Badge } from '../components/ui/Badge'
import { SESSION_STATUS_LABELS, SESSION_STATUS_TONES } from './labels'

function getInitials(name) {
  const parts = name.trim().split(/\s+/)
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
}

function ChildPlanningSection({ student }) {
  const [detail, setDetail] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    api
      .get(`/family/students/${student.id}`)
      .then((data) => {
        if (!cancelled) setDetail(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
    return () => {
      cancelled = true
    }
  }, [student.id])

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-navy font-medium text-gold-400">
          {student.photoUrl ? (
            <img src={student.photoUrl} alt={student.name} className="h-full w-full object-cover" />
          ) : (
            getInitials(student.name)
          )}
        </div>
        <div className="min-w-0 flex-1">
          <Link
            to={`/eleves/${student.id}`}
            className="truncate font-serif text-base font-bold text-navy hover:underline"
          >
            {student.name}
          </Link>
          {student.school && <p className="truncate text-xs text-gray-500">{student.school}</p>}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {!error && !detail && <Spinner />}
      {detail && <SessionsBoard sessions={detail.sessions ?? []} />}
    </Card>
  )
}

function FamilySessionCard({ session }) {
  const time = new Date(session.date).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  })
  return (
    <Card className="p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium text-gray-900">
          {time}
          {session.subject ? ` · ${session.subject}` : ''}
        </p>
        <Badge tone={SESSION_STATUS_TONES[session.status] ?? 'gray'}>
          {SESSION_STATUS_LABELS[session.status] ?? session.status}
        </Badge>
      </div>
      <p className="text-xs text-gray-500">
        {session.studentName}
        {session.teacher ? ` · ${session.teacher.name}` : ''}
      </p>
      {session.notes && (
        <p className="mt-1 whitespace-pre-wrap break-words text-xs text-gray-600">{session.notes}</p>
      )}
    </Card>
  )
}

export function Planning() {
  const { students, error } = useStudents()
  const [view, setView] = useState('calendrier')
  const [allSessions, setAllSessions] = useState(null)
  const [sessionsError, setSessionsError] = useState(null)

  // Le calendrier regroupe les seances de tous les enfants sur une meme grille.
  useEffect(() => {
    if (!students || students.length === 0) return
    let cancelled = false
    Promise.all(
      students.map((student) =>
        api
          .get(`/family/students/${student.id}`)
          .then((detail) =>
            (detail.sessions ?? []).map((session) => ({ ...session, studentName: student.name })),
          ),
      ),
    )
      .then((lists) => {
        if (!cancelled) setAllSessions(lists.flat())
      })
      .catch((err) => {
        if (!cancelled) setSessionsError(err.message)
      })
    return () => {
      cancelled = true
    }
  }, [students])

  if (error) {
    return <p className="text-red-600">{error}</p>
  }

  if (!students) {
    return <Spinner />
  }

  if (students.length === 0) {
    return (
      <Card className="p-8">
        <EmptyState
          icon={GraduationCap}
          title="Aucun enfant associé à ton compte pour l'instant"
          description="Ajoute le profil de ton enfant pour voir son planning."
        />
        <div className="mt-4 flex justify-center">
          <Link to="/eleves/nouveau">
            <Button icon={UserPlus}>Ajouter un enfant</Button>
          </Link>
        </div>
      </Card>
    )
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarClock size={20} className="text-gold-500" />
          <h1 className="font-serif text-2xl font-bold text-navy">Planning</h1>
        </div>
        <div className="inline-flex rounded-full bg-gray-100 p-1 text-sm">
          {[
            ['calendrier', 'Calendrier'],
            ['enfants', 'Par enfant'],
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
      {view === 'calendrier' ? (
        sessionsError ? (
          <p className="text-red-600">{sessionsError}</p>
        ) : !allSessions ? (
          <Spinner />
        ) : (
          <PlanningCalendar
            sessions={allSessions}
            renderSession={(session) => <FamilySessionCard session={session} />}
          />
        )
      ) : (
        <div className="space-y-6">
          {students.map((student) => (
            <ChildPlanningSection key={student.id} student={student} />
          ))}
        </div>
      )}
    </div>
  )
}
