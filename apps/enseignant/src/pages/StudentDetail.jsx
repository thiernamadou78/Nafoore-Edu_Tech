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
  Sparkles,
  Users,
} from 'lucide-react'
import { api } from '../lib/api'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Spinner } from '../components/ui/Spinner'
import { LEVEL_LABELS, PROGRESS_ENTRY_LABELS, PROGRESS_ENTRY_TONES } from './labels'

const inputClass =
  'rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy'

export function StudentDetail() {
  const { id } = useParams()
  const [student, setStudent] = useState(null)
  const [error, setError] = useState(null)
  const [progressEntries, setProgressEntries] = useState([])
  const [progressForm, setProgressForm] = useState({ subject: '', status: 'en_progres' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api
      .get(`/teacher/students/${id}`)
      .then(setStudent)
      .catch((err) => setError(err.message))
    api
      .get(`/teacher/students/${id}/progress-entries`)
      .then(setProgressEntries)
      .catch(() => {})
  }, [id])

  const saveProgressEntry = async () => {
    setSaving(true)
    try {
      await api.put(`/teacher/students/${id}/progress-entries`, progressForm)
      const entries = await api.get(`/teacher/students/${id}/progress-entries`)
      setProgressEntries(entries)
      setProgressForm({ subject: '', status: 'en_progres' })
    } finally {
      setSaving(false)
    }
  }

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

      <Card className="mb-6 p-5">
        <h2 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
          <Sparkles size={16} className="text-gold-500" />
          Progression (par matière)
        </h2>
        <p className="mb-3 text-xs text-gray-500">
          Visible par la famille et l'équipe Nafoore Education. Une seule entrée par matière — enregistrer à
          nouveau met à jour le statut existant.
        </p>
        <div className="mb-4 space-y-2">
          {progressEntries.length === 0 ? (
            <p className="text-sm text-gray-500">Aucune matière suivie pour l'instant.</p>
          ) : (
            progressEntries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-800">{entry.subject}</span>
                <Badge tone={PROGRESS_ENTRY_TONES[entry.status]}>
                  {PROGRESS_ENTRY_LABELS[entry.status] ?? entry.status}
                </Badge>
              </div>
            ))
          )}
        </div>
        <div className="flex flex-wrap items-end gap-2 border-t border-gray-100 pt-4">
          <div>
            <label className="mb-1 block text-xs text-gray-500">Matière</label>
            <select
              value={progressForm.subject}
              onChange={(e) => setProgressForm((f) => ({ ...f, subject: e.target.value }))}
              disabled={student.subjects.length === 0}
              className={inputClass}
            >
              <option value="">Choisir une matière</option>
              {student.subjects.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">Statut</label>
            <select
              value={progressForm.status}
              onChange={(e) => setProgressForm((f) => ({ ...f, status: e.target.value }))}
              className={inputClass}
            >
              {Object.entries(PROGRESS_ENTRY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <Button
            icon={Sparkles}
            loading={saving}
            disabled={!progressForm.subject}
            onClick={saveProgressEntry}
          >
            Enregistrer
          </Button>
        </div>
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
