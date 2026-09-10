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

export function Planning() {
  const { students, error } = useStudents()

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
      <div className="mb-6 flex items-center gap-2">
        <CalendarClock size={20} className="text-gold-500" />
        <h1 className="font-serif text-2xl font-bold text-navy">Planning</h1>
      </div>
      <div className="space-y-6">
        {students.map((student) => (
          <ChildPlanningSection key={student.id} student={student} />
        ))}
      </div>
    </div>
  )
}
