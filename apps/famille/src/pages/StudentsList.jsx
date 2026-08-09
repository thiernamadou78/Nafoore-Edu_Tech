import { Navigate, Link } from 'react-router-dom'
import { CalendarClock, GraduationCap, UserPlus, Users } from 'lucide-react'
import { useStudents } from '../context/StudentsContext'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { Spinner } from '../components/ui/Spinner'
import { CHILD_STATUS_LABELS, CHILD_STATUS_TONES } from './labels'

const BORDER_BY_STATUS = {
  actif: 'border-l-leaf-500',
  en_attente: 'border-l-amberStrong-500',
}

function getInitials(name) {
  const parts = name.trim().split(/\s+/)
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
}

function ChildCard({ student }) {
  const status = student.pendingRequestStatus ? 'en_attente' : 'actif'

  return (
    <Card className={`flex flex-col border-l-[3px] ${BORDER_BY_STATUS[status]}`}>
      <div className="flex items-center gap-3 p-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-navy font-medium text-gold-400">
          {student.photoUrl ? (
            <img src={student.photoUrl} alt={student.name} className="h-full w-full object-cover" />
          ) : (
            getInitials(student.name)
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-serif text-base font-medium text-gray-900">{student.name}</p>
          {student.school && <p className="truncate text-xs text-gray-500">{student.school}</p>}
        </div>
        <Badge tone={CHILD_STATUS_TONES[status]}>{CHILD_STATUS_LABELS[status]}</Badge>
      </div>

      <div className="border-t border-gray-100" />

      <div className="flex-1 space-y-2 p-4 text-sm">
        {status === 'actif' ? (
          <>
            <div className="flex items-center gap-2 text-gray-700">
              <CalendarClock size={15} className="shrink-0 text-gray-400" />
              {student.nextSession ? (
                <span>
                  {new Date(student.nextSession.date).toLocaleString('fr-FR', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </span>
              ) : (
                <span className="text-gray-500">Aucune séance planifiée</span>
              )}
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <Users size={15} className="shrink-0 text-gray-400" />
              {student.teacherName ? (
                <span>{student.teacherName}</span>
              ) : (
                <span className="text-gray-500">Aucun enseignant assigné</span>
              )}
            </div>
          </>
        ) : (
          <p className="text-gray-600">
            En attente de matching. Un professeur va être proposé sous peu.
          </p>
        )}
      </div>

      <div className="p-4 pt-0">
        <Link to={`/eleves/${student.id}`} className="block">
          <Button variant="secondary" className="w-full">
            {status === 'actif' ? 'Voir le suivi' : 'Voir ma demande'}
          </Button>
        </Link>
      </div>
    </Card>
  )
}

export function StudentsList() {
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
          description="Ajoute le profil de ton enfant pour commencer."
        />
        <div className="mt-4 flex justify-center">
          <Link to="/eleves/nouveau">
            <Button icon={UserPlus}>Ajouter un enfant</Button>
          </Link>
        </div>
      </Card>
    )
  }

  if (students.length === 1) {
    return <Navigate to={`/eleves/${students[0].id}`} replace />
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold text-navy">Mes enfants</h1>
        <Link to="/eleves/nouveau">
          <Button variant="secondary" icon={UserPlus}>
            Ajouter un enfant
          </Button>
        </Link>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-4">
        {students.map((student) => (
          <ChildCard key={student.id} student={student} />
        ))}
      </div>
    </div>
  )
}
