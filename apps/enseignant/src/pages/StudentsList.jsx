import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarClock, GraduationCap } from 'lucide-react'
import { api } from '../lib/api'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { Spinner } from '../components/ui/Spinner'

function getInitials(name) {
  const parts = name.trim().split(/\s+/)
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
}

function StudentCard({ student }) {
  return (
    <Card className="flex flex-col">
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
      </div>

      <div className="border-t border-gray-100" />

      <div className="flex-1 space-y-3 p-4 text-sm">
        {student.subjects.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {student.subjects.map((subject) => (
              <Badge key={subject} tone="gold">
                {subject}
              </Badge>
            ))}
          </div>
        )}
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
      </div>

      <div className="p-4 pt-0">
        <Link to={`/eleves/${student.id}`} className="block">
          <Button variant="secondary" className="w-full">
            Voir la fiche
          </Button>
        </Link>
      </div>
    </Card>
  )
}

export function StudentsList() {
  const [students, setStudents] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    api
      .get('/teacher/students')
      .then(setStudents)
      .catch((err) => setError(err.message))
  }, [])

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
          title="Aucun élève assigné pour l'instant"
          description="Tes élèves apparaîtront ici dès qu'une famille t'aura été confirmée."
        />
      </Card>
    )
  }

  const groups = students.reduce((acc, student) => {
    const key = student.familyId ?? 'sans-famille'
    if (!acc[key]) acc[key] = { familyName: student.familyName, students: [] }
    acc[key].students.push(student)
    return acc
  }, {})

  return (
    <div>
      <h1 className="mb-6 font-serif text-2xl font-bold text-navy">Mes élèves</h1>
      <div className="space-y-8">
        {Object.entries(groups).map(([familyId, group]) => (
          <div key={familyId}>
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">
              {group.familyName}
            </h2>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4">
              {group.students.map((student) => (
                <StudentCard key={student.id} student={student} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
