import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Pencil, Power, Search, Trash2, Users } from 'lucide-react'
import { api } from '../../lib/api'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { LEVEL_LABELS } from './labels'

const inputClass =
  'rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy'

export function StudentsList() {
  const navigate = useNavigate()
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({ level: '', subject: '' })

  const load = useCallback(() => {
    const params = new URLSearchParams(
      Object.entries(filters).filter(([, value]) => value),
    )
    setLoading(true)
    return api
      .get(`/students${params.toString() ? `?${params}` : ''}`)
      .then(setStudents)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [filters])

  useEffect(() => {
    load()
  }, [load])

  const visibleStudents = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return students
    return students.filter((student) => student.name.toLowerCase().includes(term))
  }, [students, search])

  const toggleActive = async (event, student) => {
    event.stopPropagation()
    try {
      await api.patch(`/students/${student.id}/active`, { isActive: !student.isActive })
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDelete = async (event, student) => {
    event.stopPropagation()
    if (!window.confirm(`Supprimer définitivement ${student.name} ?`)) return
    try {
      await api.del(`/students/${student.id}`)
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-baseline gap-2">
        <h1 className="text-xl font-semibold text-gray-900">Élèves</h1>
        <span className="text-sm text-gray-400">{students.length}</span>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un élève"
            className={`${inputClass} py-2 pl-9`}
          />
        </div>
        <select
          value={filters.level}
          onChange={(e) => setFilters((f) => ({ ...f, level: e.target.value }))}
          className={inputClass}
        >
          <option value="">Tous les niveaux</option>
          {Object.entries(LEVEL_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <input
          placeholder="Matière"
          value={filters.subject}
          onChange={(e) => setFilters((f) => ({ ...f, subject: e.target.value }))}
          className={inputClass}
        />
      </div>

      {error && <p className="mb-4 text-red-600">{error}</p>}

      <Card className="overflow-hidden">
        {loading ? (
          <p className="p-6 text-sm text-gray-500">Chargement…</p>
        ) : visibleStudents.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Aucun élève"
            description="Ajuste les filtres ou convertis un lead."
          />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">Élève</th>
                <th className="px-4 py-3 font-medium">Niveau</th>
                <th className="px-4 py-3 font-medium">Matières</th>
                <th className="px-4 py-3 font-medium">Enseignant(s)</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visibleStudents.map((student) => (
                <tr
                  key={student.id}
                  onClick={() => navigate(`/eleves/${student.id}`)}
                  className="cursor-pointer hover:bg-gray-50"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={student.name} photoUrl={student.photoUrl} />
                      <span className="font-medium text-gray-900">{student.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {LEVEL_LABELS[student.level] ?? student.level}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {student.subjects.join(', ') || '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {student.teachers.map((t) => t.teacher.name).join(', ') || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={student.isActive ? 'green' : 'gray'}>
                      {student.isActive ? 'Actif' : 'Inactif'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        title="Modifier"
                        onClick={(event) => {
                          event.stopPropagation()
                          navigate(`/eleves/${student.id}`)
                        }}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-navy"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        title={student.isActive ? 'Désactiver' : 'Activer'}
                        onClick={(event) => toggleActive(event, student)}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-navy"
                      >
                        <Power size={16} />
                      </button>
                      <button
                        title="Supprimer"
                        onClick={(event) => handleDelete(event, student)}
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
