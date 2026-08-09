import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, GraduationCap } from 'lucide-react'
import { api } from '../lib/api'
import { useStudents } from '../context/StudentsContext'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy'

const DEFAULT_FORM = { name: '', level: 'college', school: '', address: '', subjects: '' }

export function AddStudent() {
  const navigate = useNavigate()
  const { refresh } = useStudents()
  const [form, setForm] = useState(DEFAULT_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const student = await api.post('/family/students', {
        name: form.name,
        level: form.level,
        school: form.school || undefined,
        address: form.address || undefined,
        subjects: form.subjects
          ? form.subjects.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
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
              onChange={(e) => setForm({ ...form, level: e.target.value })}
              className={inputClass}
            >
              <option value="college">Collège</option>
              <option value="lycee">Lycée</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">École (optionnel)</label>
            <input
              type="text"
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
              Matières d'intérêt (optionnel, séparées par des virgules)
            </label>
            <input
              type="text"
              placeholder="Mathématiques, Physique-Chimie"
              value={form.subjects}
              onChange={(e) => setForm({ ...form, subjects: e.target.value })}
              className={inputClass}
            />
          </div>

          <div className="flex gap-2">
            <Link to="/" className="flex-1">
              <Button type="button" variant="secondary" className="w-full">
                Annuler
              </Button>
            </Link>
            <Button type="submit" icon={GraduationCap} disabled={submitting} className="flex-1">
              {submitting ? 'Création…' : 'Ajouter cet enfant'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
