import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Pencil, Power, Search, Trash2, Users } from 'lucide-react'
import { api } from '../../lib/api'
import { Alert } from '../../components/ui/Alert'
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
  const [pendingAction, setPendingAction] = useState(null)

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
    const key = `${student.id}:active`
    setPendingAction(key)
    setError(null)
    try {
      await api.patch(`/students/${student.id}/active`, { isActive: !student.isActive })
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setPendingAction(null)
    }
  }

  const handleDelete = async (event, student) => {
    event.stopPropagation()
    if (!window.confirm(`Supprimer définitivement ${student.name} ?`)) return
    const key = `${student.id}:delete`
    setPendingAction(key)
    setError(null)
    try {
      await api.del(`/students/${student.id}`)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setPendingAction(null)
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

      {error && <Alert>{error}</Alert>}

      {loading ? (
        <Card className="p-6">
          <p className="text-sm text-gray-500">Chargement…</p>
        </Card>
      ) : visibleStudents.length === 0 ? (
        <Card className="overflow-hidden">
          <EmptyState
            icon={Users}
            title="Aucun élève"
            description="Ajuste les filtres ou convertis un lead."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-4">
          {visibleStudents.map((student) => (
            <Card
              key={student.id}
              onClick={() => navigate(`/eleves/${student.id}`)}
              className={`flex cursor-pointer flex-col border-l-[3px] transition-shadow hover:shadow-md ${
                student.isActive ? 'border-l-green-500' : 'border-l-gray-300'
              }`}
            >
              <div className="flex items-center gap-3 p-4">
                <Avatar name={student.name} photoUrl={student.photoUrl} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-gray-900">{student.name}</p>
                  <p className="truncate text-xs text-gray-500">
                    {LEVEL_LABELS[student.level] ?? student.level}
                  </p>
                </div>
                <Badge tone={student.isActive ? 'green' : 'gray'}>
                  {student.isActive ? 'Actif' : 'Inactif'}
                </Badge>
              </div>

              <div className="border-t border-gray-100" />

              <div className="flex-1 space-y-1.5 p-4 text-sm">
                <p className="text-gray-700">
                  <span className="text-gray-400">Matières · </span>
                  {student.subjects.join(', ') || '—'}
                </p>
                <p className="text-gray-700">
                  <span className="text-gray-400">Enseignant(s) · </span>
                  {student.teachers.map((t) => t.teacher.name).join(', ') || '—'}
                </p>
              </div>

              <div className="flex items-center justify-end gap-1 border-t border-gray-100 p-2">
                <button
                  title="Modifier"
                  onClick={(event) => {
                    event.stopPropagation()
                    navigate(`/eleves/${student.id}`)
                  }}
                  className="rounded-lg p-1.5 text-gray-400 transition-all duration-150 hover:bg-gray-100 hover:text-navy active:scale-90"
                >
                  <Pencil size={16} />
                </button>
                <button
                  title={student.isActive ? 'Désactiver' : 'Activer'}
                  onClick={(event) => toggleActive(event, student)}
                  disabled={pendingAction === `${student.id}:active`}
                  className="rounded-lg p-1.5 text-gray-400 transition-all duration-150 hover:bg-gray-100 hover:text-navy active:scale-90 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
                >
                  {pendingAction === `${student.id}:active` ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Power size={16} />
                  )}
                </button>
                <button
                  title="Supprimer"
                  onClick={(event) => handleDelete(event, student)}
                  disabled={pendingAction === `${student.id}:delete`}
                  className="rounded-lg p-1.5 text-gray-400 transition-all duration-150 hover:bg-red-50 hover:text-red-600 active:scale-90 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
                >
                  {pendingAction === `${student.id}:delete` ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Trash2 size={16} />
                  )}
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
