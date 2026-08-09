import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  BookOpen,
  CalendarClock,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  School,
  Users,
} from 'lucide-react'
import { api } from '../lib/api'
import { Badge } from '../components/ui/Badge'
import { Card } from '../components/ui/Card'
import { Spinner } from '../components/ui/Spinner'
import { LEVEL_LABELS } from './labels'

export function StudentDetail() {
  const { id } = useParams()
  const [student, setStudent] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    api
      .get(`/teacher/students/${id}`)
      .then(setStudent)
      .catch((err) => setError(err.message))
  }, [id])

  if (error) {
    return <p className="text-red-600">{error}</p>
  }

  if (!student) {
    return <Spinner />
  }

  return (
    <div className="max-w-2xl">
      <Link
        to="/"
        className="mb-4 inline-flex items-center gap-1 text-sm text-navy hover:underline"
      >
        <ArrowLeft size={14} />
        Mes élèves
      </Link>

      <h1 className="mb-1 font-serif text-2xl font-bold text-navy">{student.name}</h1>

      <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
        <span className="flex items-center gap-1.5">
          <GraduationCap size={14} className="text-gray-400" />
          {LEVEL_LABELS[student.level] ?? student.level}
        </span>
        {student.school && (
          <>
            <span className="h-5 w-px bg-gray-200" />
            <span className="flex items-center gap-1.5">
              <School size={14} className="text-gray-400" />
              {student.school}
            </span>
          </>
        )}
        {student.address && (
          <>
            <span className="h-5 w-px bg-gray-200" />
            <span className="flex items-center gap-1.5">
              <MapPin size={14} className="text-gray-400" />
              {student.address}
            </span>
          </>
        )}
      </div>

      <Card className="mb-6 p-5">
        <h2 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
          <BookOpen size={16} className="text-gold-500" />
          Matières enseignées
        </h2>
        {student.subjects.length === 0 ? (
          <p className="text-sm text-gray-500">Aucune matière renseignée.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {student.subjects.map((subject) => (
              <Badge key={subject} tone="gold">
                {subject}
              </Badge>
            ))}
          </div>
        )}
      </Card>

      <Card className="mb-6 p-5">
        <h2 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
          <CalendarClock size={16} className="text-gold-500" />
          Prochaine séance
        </h2>
        {student.nextSession ? (
          <p className="text-sm text-gray-700">
            {new Date(student.nextSession.date).toLocaleString('fr-FR', {
              dateStyle: 'full',
              timeStyle: 'short',
            })}
            {student.nextSession.subject && ` · ${student.nextSession.subject}`}
          </p>
        ) : (
          <p className="text-sm text-gray-500">Aucune séance planifiée.</p>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
          <Users size={16} className="text-gold-500" />
          Contact famille
        </h2>
        {student.family ? (
          <div className="space-y-2 text-sm text-gray-700">
            <p className="font-medium text-gray-900">{student.family.name}</p>
            {student.family.email && (
              <p className="flex items-center gap-1.5 text-gray-600">
                <Mail size={14} className="text-gray-400" />
                {student.family.email}
              </p>
            )}
            {student.family.phone && (
              <p className="flex items-center gap-1.5 text-gray-600">
                <Phone size={14} className="text-gray-400" />
                {student.family.phone}
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-500">Aucun contact renseigné.</p>
        )}
      </Card>
    </div>
  )
}
