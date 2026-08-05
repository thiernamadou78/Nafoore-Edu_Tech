import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Contact2, Pencil, Plus, Power, Search, Trash2 } from 'lucide-react'
import { api } from '../../lib/api'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'

const inputClass =
  'rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy'

const EMPTY_FORM = { name: '', subjects: '', zone: '', email: '', phone: '' }

export function TeachersList() {
  const navigate = useNavigate()
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(
    () =>
      api
        .get('/teachers')
        .then(setTeachers)
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false)),
    [],
  )

  useEffect(() => {
    load()
  }, [load])

  const toggleVerified = async (event, teacher) => {
    event.stopPropagation()
    try {
      await api.patch(`/teachers/${teacher.id}/verified`, { verified: !teacher.verified })
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDelete = async (event, teacher) => {
    event.stopPropagation()
    if (!window.confirm(`Supprimer définitivement ${teacher.name} ?`)) return
    try {
      await api.del(`/teachers/${teacher.id}`)
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  const visibleTeachers = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return teachers
    return teachers.filter((teacher) => teacher.name.toLowerCase().includes(term))
  }, [teachers, search])

  const handleCreate = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await api.post('/teachers', {
        name: form.name,
        subjects: form.subjects
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        zone: form.zone || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
      })
      setForm(EMPTY_FORM)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-baseline gap-2">
        <h1 className="text-xl font-semibold text-gray-900">Enseignants</h1>
        <span className="text-sm text-gray-400">{teachers.length}</span>
      </div>

      <Card className="mb-6 p-6">
        <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Nom</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Matières (séparées par des virgules)
            </label>
            <input
              value={form.subjects}
              onChange={(e) => setForm((f) => ({ ...f, subjects: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Zone</label>
            <input
              value={form.zone}
              onChange={(e) => setForm((f) => ({ ...f, zone: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Téléphone</label>
            <input
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className={inputClass}
            />
          </div>
          <Button type="submit" icon={Plus} disabled={submitting}>
            Ajouter
          </Button>
        </form>
      </Card>

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un enseignant"
            className={`${inputClass} py-2 pl-9`}
          />
        </div>
      </div>

      {error && <p className="mb-4 text-red-600">{error}</p>}

      <Card className="overflow-hidden">
        {loading ? (
          <p className="p-6 text-sm text-gray-500">Chargement…</p>
        ) : visibleTeachers.length === 0 ? (
          <EmptyState
            icon={Contact2}
            title="Aucun enseignant"
            description="Ajoute-en un directement, ou valide une candidature depuis Recrutement."
          />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">Enseignant</th>
                <th className="px-4 py-3 font-medium">Matières</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visibleTeachers.map((teacher) => (
                <tr
                  key={teacher.id}
                  onClick={() => navigate(`/enseignants/${teacher.id}`)}
                  className="cursor-pointer hover:bg-gray-50"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={teacher.name} photoUrl={teacher.photoUrl} />
                      <span className="font-medium text-gray-900">{teacher.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {teacher.subjects.join(', ') || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={teacher.verified ? 'green' : 'gray'}>
                      {teacher.verified ? 'Actif' : 'Inactif'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        title="Modifier"
                        onClick={(event) => {
                          event.stopPropagation()
                          navigate(`/enseignants/${teacher.id}`)
                        }}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-navy"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        title={teacher.verified ? 'Désactiver' : 'Activer'}
                        onClick={(event) => toggleVerified(event, teacher)}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-navy"
                      >
                        <Power size={16} />
                      </button>
                      <button
                        title="Supprimer"
                        onClick={(event) => handleDelete(event, teacher)}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
