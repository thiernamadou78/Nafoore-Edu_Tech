import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Inbox, Search } from 'lucide-react'
import { api } from '../../lib/api'
import { Alert } from '../../components/ui/Alert'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { LEAD_STATUS_LABELS, LEAD_STATUS_TONES, PROFILE_LABELS } from './statusLabels'

const inputClass =
  'rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy'

export function LeadsList() {
  const navigate = useNavigate()
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({ profile: '', status: '', from: '', to: '' })

  useEffect(() => {
    const params = new URLSearchParams(
      Object.entries(filters).filter(([, value]) => value),
    )
    setLoading(true)
    api
      .get(`/leads${params.toString() ? `?${params}` : ''}`)
      .then(setLeads)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [filters])

  const visibleLeads = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return leads
    return leads.filter(
      (lead) =>
        lead.name.toLowerCase().includes(term) || lead.email.toLowerCase().includes(term),
    )
  }, [leads, search])

  return (
    <div>
      <div className="mb-6 flex items-baseline gap-2">
        <h1 className="text-xl font-semibold text-gray-900">Leads</h1>
        <span className="text-sm text-gray-400">{leads.length}</span>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un lead"
            className={`${inputClass} py-2 pl-9`}
          />
        </div>
        <select
          value={filters.profile}
          onChange={(e) => setFilters((f) => ({ ...f, profile: e.target.value }))}
          className={inputClass}
        >
          <option value="">Tous les profils</option>
          {Object.entries(PROFILE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          className={inputClass}
        >
          <option value="">Tous les statuts</option>
          {Object.entries(LEAD_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <div>
          <label className="mb-1 block text-xs text-gray-500">Du</label>
          <input
            type="date"
            value={filters.from}
            onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">Au</label>
          <input
            type="date"
            value={filters.to}
            onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
            className={inputClass}
          />
        </div>
      </div>

      {error && <Alert>{error}</Alert>}

      <Card className="overflow-hidden">
        {loading ? (
          <p className="p-6 text-sm text-gray-500">Chargement…</p>
        ) : visibleLeads.length === 0 ? (
          <EmptyState icon={Inbox} title="Aucun lead" description="Ajuste les filtres ou reviens plus tard." />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">Profil</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 font-medium">Assigné à</th>
                <th className="px-4 py-3 font-medium">Reçu le</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visibleLeads.map((lead) => (
                <tr
                  key={lead.id}
                  onClick={() => navigate(`/leads/${lead.id}`)}
                  className="cursor-pointer hover:bg-gray-50"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={lead.name} />
                      <div>
                        <div className="font-medium text-gray-900">{lead.name}</div>
                        <div className="text-gray-500">{lead.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {PROFILE_LABELS[lead.profile] ?? lead.profile}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={LEAD_STATUS_TONES[lead.status]}>
                      {LEAD_STATUS_LABELS[lead.status] ?? lead.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{lead.assignedTo?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(lead.createdAt).toLocaleDateString('fr-FR')}
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
