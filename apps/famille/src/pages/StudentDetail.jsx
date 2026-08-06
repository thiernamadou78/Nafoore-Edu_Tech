import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { CalendarClock, GraduationCap, MapPin, School, Sparkles, Users } from 'lucide-react'
import { api } from '../lib/api'
import { Badge } from '../components/ui/Badge'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { LEVEL_LABELS, SESSION_STATUS_LABELS, SESSION_STATUS_TONES } from './labels'

export function StudentDetail() {
  const { id } = useParams()
  const [student, setStudent] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    api
      .get(`/family/students/${id}`)
      .then(setStudent)
      .catch((err) => setError(err.message))
  }, [id])

  if (error) {
    return <p className="text-red-600">{error}</p>
  }

  if (!student) {
    return <p className="text-gray-500">Chargement…</p>
  }

  const now = Date.now()
  const nextSession = [...student.sessions]
    .filter((s) => new Date(s.date).getTime() >= now && s.status !== 'annulee')
    .sort((a, b) => new Date(a.date) - new Date(b.date))[0]

  return (
    <div>
      {/* En-tête élève */}
      <div className="mb-6 flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-navy/10 text-navy">
          {student.photoUrl ? (
            <img src={student.photoUrl} alt={student.name} className="h-full w-full object-cover" />
          ) : (
            <GraduationCap size={26} />
          )}
        </div>
        <div>
          <h1 className="font-serif text-2xl font-bold text-navy">{student.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
            <span className="inline-flex items-center gap-1.5">
              <GraduationCap size={14} />
              {LEVEL_LABELS[student.level] ?? student.level}
            </span>
            {student.school && (
              <span className="inline-flex items-center gap-1.5">
                <School size={14} />
                {student.school}
              </span>
            )}
            {student.address && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin size={14} />
                {student.address}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        {/* Prochaine séance */}
        <Card className="p-5">
          <h2 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
            <CalendarClock size={16} className="text-gold-500" />
            Prochaine séance
          </h2>
          {nextSession ? (
            <div>
              <p className="text-sm font-medium text-gray-800">
                {new Date(nextSession.date).toLocaleString('fr-FR', {
                  dateStyle: 'full',
                  timeStyle: 'short',
                })}
              </p>
              {nextSession.teacher && (
                <p className="mt-1 text-sm text-gray-500">avec {nextSession.teacher.name}</p>
              )}
              <Badge tone={SESSION_STATUS_TONES[nextSession.status]} className="mt-2">
                {SESSION_STATUS_LABELS[nextSession.status] ?? nextSession.status}
              </Badge>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Aucune séance planifiée pour l'instant.</p>
          )}
        </Card>

        {/* Enseignants */}
        <Card className="p-5">
          <h2 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
            <Users size={16} className="text-gold-500" />
            Enseignants
          </h2>
          {student.teachers.length > 0 ? (
            <ul className="space-y-1.5 text-sm text-gray-700">
              {student.teachers.map(({ teacher }) => (
                <li key={teacher.id}>
                  {teacher.name}
                  {teacher.subjects.length > 0 && (
                    <span className="text-gray-400"> — {teacher.subjects.join(', ')}</span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">Aucun enseignant assigné pour l'instant.</p>
          )}
        </Card>
      </div>

      {/* Progression */}
      <Card className="mb-6 p-5">
        <h2 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
          <Sparkles size={16} className="text-gold-500" />
          Progression
        </h2>
        {student.progressReports.length > 0 ? (
          <div className="space-y-4">
            {student.progressReports.map((report) => (
              <div key={report.id} className="border-l-2 border-gold-400 pl-3">
                {report.period && (
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    {report.period}
                  </p>
                )}
                <p className="whitespace-pre-wrap text-sm text-gray-700">{report.content}</p>
                <p className="mt-1 text-xs text-gray-400">
                  {new Date(report.createdAt).toLocaleDateString('fr-FR')}
                </p>
              </div>
            ))}
          </div>
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
        {student.sessions.length > 0 ? (
          <ul className="divide-y divide-gray-100">
            {student.sessions.map((session) => (
              <li key={session.id} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <p className="text-gray-800">
                    {new Date(session.date).toLocaleString('fr-FR', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </p>
                  {session.teacher && <p className="text-xs text-gray-400">{session.teacher.name}</p>}
                </div>
                <Badge tone={SESSION_STATUS_TONES[session.status]}>
                  {SESSION_STATUS_LABELS[session.status] ?? session.status}
                </Badge>
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
