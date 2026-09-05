import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, GraduationCap, X } from 'lucide-react'
import { api } from '../lib/api'
import { useStudents } from '../context/StudentsContext'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { CLASSE_LABELS } from './labels'
import { CLASSE_OPTIONS_BY_LEVEL, SUBJECTS_BY_LEVEL } from './curriculum'

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy'

const DEFAULT_FORM = {
  name: '',
  level: 'college',
  classe: '',
  school: '',
  address: '',
  subjects: [],
}

const PILL_TONES = ['blue', 'indigo', 'green', 'amber', 'sky', 'leaf', 'clay', 'amberStrong']

export function AddStudent() {
  const navigate = useNavigate()
  const { refresh } = useStudents()
  const [form, setForm] = useState(DEFAULT_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const availableSubjects = SUBJECTS_BY_LEVEL[form.level] ?? []
  const classeOptions = CLASSE_OPTIONS_BY_LEVEL[form.level] ?? []

  const addSubject = (subject) => {
    if (!subject || form.subjects.includes(subject)) return
    setForm((f) => ({ ...f, subjects: [...f.subjects, subject] }))
  }

  const removeSubject = (subject) => {
    setForm((f) => ({ ...f, subjects: f.subjects.filter((s) => s !== subject) }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const student = await api.post('/family/students', {
        name: form.name,
        level: form.level,
        classe: form.classe,
        school: form.school,
        address: form.address || undefined,
        subjects: form.subjects,
      })
      await refresh()
      navigate(`/eleves/${student.id}`, { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <Link
        to="/"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-navy hover:underline"
      >
        <ArrowLeft size={14} />
        Retour
      </Link>
      <h1 className="mb-6 font-serif text-2xl font-bold text-navy">Ajouter un enfant</h1>
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-red-600">{error}</p>}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Prénom et nom</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Niveau scolaire</label>
            <select
              value={form.level}
              onChange={(e) => {
                const level = e.target.value
                setForm((f) => ({
                  ...f,
                  level,
                  classe: '',
                  subjects: f.subjects.filter((s) => (SUBJECTS_BY_LEVEL[level] ?? []).includes(s)),
                }))
              }}
              className={inputClass}
            >
              <option value="primaire">Primaire</option>
              <option value="college">Collège</option>
              <option value="lycee">Lycée</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Classe</label>
            <select
              required
              value={form.classe}
              onChange={(e) => setForm({ ...form, classe: e.target.value })}
              className={inputClass}
            >
              <option value="" disabled>
                Choisir une classe
              </option>
              {classeOptions.map((classe) => (
                <option key={classe} value={classe}>
                  {CLASSE_LABELS[classe]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">École</label>
            <input
              type="text"
              required
              value={form.school}
              onChange={(e) => setForm({ ...form, school: e.target.value })}
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Adresse (optionnel)</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Matières d'intérêt (optionnel)
            </label>
            <select
              value=""
              onChange={(e) => addSubject(e.target.value)}
              className={inputClass}
            >
              <option value="">Ajouter une matière…</option>
              {availableSubjects
                .filter((subject) => !form.subjects.includes(subject))
                .map((subject) => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))}
            </select>
            {form.subjects.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {form.subjects.map((subject, index) => (
                  <Badge key={subject} tone={PILL_TONES[index % PILL_TONES.length]}>
                    {subject}
                    <button
                      type="button"
                      onClick={() => removeSubject(subject)}
                      className="ml-0.5 rounded-full hover:opacity-70"
                      aria-label={`Retirer ${subject}`}
                    >
                      <X size={12} />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Link to="/" className="flex-1">
              <Button type="button" variant="secondary" className="w-full">
                Annuler
              </Button>
            </Link>
            <Button type="submit" icon={GraduationCap} loading={submitting} className="flex-1">
              {submitting ? 'Création…' : 'Ajouter cet enfant'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
