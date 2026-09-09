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
  Trash2,
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

const DAY_OPTIONS = [
  { value: 1, label: 'Lundi' },
  { value: 2, label: 'Mardi' },
  { value: 3, label: 'Mercredi' },
  { value: 4, label: 'Jeudi' },
  { value: 5, label: 'Vendredi' },
  { value: 6, label: 'Samedi' },
  { value: 7, label: 'Dimanche' },
]
const DAY_LABELS = Object.fromEntries(DAY_OPTIONS.map((d) => [d.value, d.label]))
const DURATION_OPTIONS = [30, 45, 60, 90, 120]

function defaultSlots(count) {
  return Array.from({ length: count }, (_, i) => ({
    dayOfWeek: DAY_OPTIONS[i % DAY_OPTIONS.length].value,
    time: '14:00',
  }))
}

function ScheduleSection({ studentId, schedule, subjects, onChange }) {
  const [editing, setEditing] = useState(false)
  const [frequency, setFrequency] = useState(schedule?.frequency ?? 2)
  const [slots, setSlots] = useState(schedule?.slots ?? defaultSlots(2))
  const [subject, setSubject] = useState(schedule?.subject ?? subjects[0] ?? '')
  const [durationMinutes, setDurationMinutes] = useState(schedule?.durationMinutes ?? 60)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const startEditing = () => {
    setFrequency(schedule?.frequency ?? 2)
    setSlots(schedule?.slots ?? defaultSlots(2))
    setSubject(schedule?.subject ?? subjects[0] ?? '')
    setDurationMinutes(schedule?.durationMinutes ?? 60)
    setError(null)
    setEditing(true)
  }

  const handleFrequencyChange = (value) => {
    const count = Number(value)
    setFrequency(count)
    setSlots((prev) => {
      if (prev.length === count) return prev
      if (prev.length < count) return [...prev, ...defaultSlots(count - prev.length)]
      return prev.slice(0, count)
    })
  }

  const updateSlot = (index, patch) => {
    setSlots((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)))
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const updated = await api.put(`/teacher/students/${studentId}/schedule`, {
        frequency,
        slots,
        subject: subject || undefined,
        durationMinutes,
      })
      onChange(updated)
      setEditing(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setSaving(true)
    setError(null)
    try {
      await api.del(`/teacher/students/${studentId}/schedule`)
      onChange(null)
      setEditing(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="mb-6 p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-semibold text-gray-900">
          <CalendarClock size={16} className="text-gold-500" />
          Programme
        </h2>
        {!editing && (
          <Button variant="secondary" onClick={startEditing}>
            {schedule ? 'Modifier' : 'Définir un planning'}
          </Button>
        )}
      </div>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      {!editing ? (
        schedule ? (
          <div className="text-sm text-gray-700">
            <p className="mb-2 font-medium text-gray-900">
              {schedule.frequency} séance{schedule.frequency > 1 ? 's' : ''} par semaine
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
            {schedule.subject && (
              <p className="mt-2 text-xs text-gray-500">Matière : {schedule.subject}</p>
            )}
            <p className="mt-2 text-xs text-gray-400">
              Les prochaines séances sont générées automatiquement sur ce rythme.
            </p>
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            Aucun planning récurrent défini. Renseigne une fréquence et des créneaux pour que les
            séances se planifient automatiquement chaque semaine.
          </p>
        )
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs text-gray-500">Fréquence</label>
              <select
                value={frequency}
                onChange={(e) => handleFrequencyChange(e.target.value)}
                className={inputClass}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n} fois par semaine
                  </option>
                ))}
              </select>
            </div>
            {subjects.length > 0 && (
              <div>
                <label className="mb-1 block text-xs text-gray-500">Matière</label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className={inputClass}
                >
                  {subjects.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="mb-1 block text-xs text-gray-500">Durée</label>
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className={inputClass}
              >
                {DURATION_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d} min
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            {slots.map((slot, index) => (
              <div key={index} className="flex items-center gap-2">
                <select
                  value={slot.dayOfWeek}
                  onChange={(e) => updateSlot(index, { dayOfWeek: Number(e.target.value) })}
                  className={inputClass}
                >
                  {DAY_OPTIONS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
                <input
                  type="time"
                  value={slot.time}
                  onChange={(e) => updateSlot(index, { time: e.target.value })}
                  className={inputClass}
                />
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <Button loading={saving} onClick={handleSave}>
              Enregistrer le planning
            </Button>
            <Button variant="secondary" onClick={() => setEditing(false)}>
              Annuler
            </Button>
            {schedule && (
              <Button variant="ghost" icon={Trash2} loading={saving} onClick={handleDelete} className="text-red-600 hover:bg-red-50">
                Supprimer le planning
              </Button>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}

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

      <ScheduleSection
        studentId={id}
        schedule={student.schedule}
        subjects={student.subjects}
        onChange={(schedule) => setStudent((s) => ({ ...s, schedule }))}
      />

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
