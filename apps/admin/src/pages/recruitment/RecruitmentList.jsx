import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, GraduationCap, Search } from 'lucide-react'
import { api } from '../../lib/api'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { STATUS_LABELS, STATUS_TONES } from './statusLabels'

const inputClass =
  'rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy'

export function RecruitmentList() {
  const navigate = useNavigate()
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({ status: '', zone: '', subject: '' })

  useEffect(() => {
    const params = new URLSearchParams(
      Object.entries(filters).filter(([, value]) => value),
    )
    setLoading(true)
    api
      .get(`/teacher-applications${params.toString() ? `?${params}` : ''}`)
      .then(setApplications)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [filters])

  const visibleApplications = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return applications
    return applications.filter(
      (application) =>
        application.candidateName.toLowerCase().includes(term) ||
        application.candidateEmail.toLowerCase().includes(term),
    )
  }, [applications, search])

  return (
    <div>
      <div className="mb-6 flex items-baseline gap-2">
        <h1 className="text-xl font-semibold text-gray-900">Candidatures enseignants</h1>
        <span className="text-sm text-gray-400">{applications.length}</span>
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
            placeholder="Rechercher un candidat"
            className={`${inputClass} py-2 pl-9`}
          />
        </div>
        <select
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          className={inputClass}
        >
          <option value="">Tous les statuts</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <input
          placeholder="Zone"
          value={filters.zone}
          onChange={(e) => setFilters((f) => ({ ...f, zone: e.target.value }))}
          className={inputClass}
        />
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
        ) : visibleApplications.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title="Aucune candidature"
            description="Ajuste les filtres ou reviens plus tard."
          />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">Candidat</th>
                <th className="px-4 py-3 font-medium">Matières</th>
                <th className="px-4 py-3 font-medium">Zone</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 font-medium">Entretien</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visibleApplications.map((application) => (
                <tr
                  key={application.id}
                  onClick={() => navigate(`/recrutement/${application.id}`)}
                  className="cursor-pointer hover:bg-gray-50"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={application.candidateName} />
                      <div>
                        <div className="font-medium text-gray-900">
                          {application.candidateName}
                        </div>
                        <div className="text-gray-500">{application.candidateEmail}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{application.subjects.join(', ')}</td>
                  <td className="px-4 py-3 text-gray-700">{application.zone}</td>
                  <td className="px-4 py-3">
                    <Badge tone={STATUS_TONES[application.status]}>
                      {STATUS_LABELS[application.status] ?? application.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {application.interviewDate
                      ? new Date(application.interviewDate).toLocaleDateString('fr-FR')
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ChevronRight size={16} className="text-gray-300" />
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
