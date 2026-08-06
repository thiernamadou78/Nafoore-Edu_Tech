import { useEffect, useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { GraduationCap } from 'lucide-react'
import { api } from '../lib/api'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { LEVEL_LABELS } from './labels'

export function StudentsList() {
  const [students, setStudents] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    api
      .get('/family/students')
      .then(setStudents)
      .catch((err) => setError(err.message))
  }, [])

  if (error) {
    return <p className="text-red-600">{error}</p>
  }

  if (!students) {
    return <p className="text-gray-500">Chargement…</p>
  }

  if (students.length === 0) {
    return (
      <Card className="p-8">
        <EmptyState
          icon={GraduationCap}
          title="Aucun enfant associé à ton compte pour l'instant"
          description="Contacte l'équipe Nafoore si tu penses qu'il s'agit d'une erreur."
        />
      </Card>
    )
  }

  if (students.length === 1) {
    return <Navigate to={`/eleves/${students[0].id}`} replace />
  }

  return (
    <div>
      <h1 className="mb-6 font-serif text-2xl font-bold text-navy">Tes enfants</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {students.map((student) => (
          <Link key={student.id} to={`/eleves/${student.id}`}>
            <Card className="flex items-center gap-4 p-5 transition-shadow hover:shadow-md">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-navy/10 text-navy">
                {student.photoUrl ? (
                  <img src={student.photoUrl} alt={student.name} className="h-full w-full object-cover" />
                ) : (
                  <GraduationCap size={20} />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold text-gray-900">{student.name}</p>
                <p className="truncate text-sm text-gray-500">
                  {LEVEL_LABELS[student.level] ?? student.level}
                  {student.school ? ` · ${student.school}` : ''}
                </p>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
