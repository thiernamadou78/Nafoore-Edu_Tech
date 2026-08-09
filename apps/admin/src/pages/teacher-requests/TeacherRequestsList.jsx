import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, UserPlus } from 'lucide-react'
import { api } from '../../lib/api'
import { Alert } from '../../components/ui/Alert'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { FORMAT_LABELS, TEACHER_REQUEST_STATUS_LABELS, TEACHER_REQUEST_STATUS_TONES } from './labels'

const inputClass =
  'rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy'

export function TeacherRequestsList() {
  const navigate = useNavigate()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [status, setStatus] = useState('')

  useEffect(() => {
    const params = status ? `?status=${status}` : ''
    setLoading(true)
    api
      .get(`/teacher-requests${params}`)
      .then(setRequests)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [status])

  return (
    <div>
      <div className="mb-6 flex items-baseline gap-2">
        <h1 className="text-xl font-semibold text-gray-900">Demandes de professeur</h1>
        <span className="text-sm text-gray-400">{requests.length}</span>
      </div>

      <div className="mb-4">
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
          <option value="">Tous les statuts</option>
          {Object.entries(TEACHER_REQUEST_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {error && <Alert>{error}</Alert>}

      <Card className="overflow-hidden">
        {loading ? (
          <p className="p-6 text-sm text-gray-500">Chargement…</p>
        ) : requests.length === 0 ? (
          <EmptyState
            icon={UserPlus}
            title="Aucune demande"
            description="Les demandes de professeur des familles apparaîtront ici."
          />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">Élève</th>
                <th className="px-4 py-3 font-medium">Famille</th>
                <th className="px-4 py-3 font-medium">Matière</th>
                <th className="px-4 py-3 font-medium">Format</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 font-medium">Reçu le</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {requests.map((request) => (
                <tr
                  key={request.id}
                  onClick={() => navigate(`/demandes-professeur/${request.id}`)}
                  className="cursor-pointer hover:bg-gray-50"
                >
                  <td className="px-4 py-3 font-medium text-gray-900">{request.student.name}</td>
                  <td className="px-4 py-3 text-gray-700">
                    {request.student.parentLead?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{request.subject}</td>
                  <td className="px-4 py-3 text-gray-700">
                    {FORMAT_LABELS[request.format] ?? request.format}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={TEACHER_REQUEST_STATUS_TONES[request.status]}>
                      {TEACHER_REQUEST_STATUS_LABELS[request.status] ?? request.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(request.createdAt).toLocaleDateString('fr-FR')}
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
