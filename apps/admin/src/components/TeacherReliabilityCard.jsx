import { useEffect, useState } from 'react'
import { Gauge } from 'lucide-react'
import { api } from '../lib/api'
import { Card } from './ui/Card'

function Metric({ value, label, alert = false }) {
  return (
    <div className="rounded-lg border border-gray-100 p-3">
      <p className={`text-lg font-bold tabular-nums ${alert ? 'text-amber-600' : 'text-navy'}`}>{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  )
}

// Fiabilite de l'enseignant sur les 3 derniers mois : pointages, retards,
// oublis et delai de redaction des comptes-rendus.
export function TeacherReliabilityCard({ teacherId }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    api
      .get(`/admin/attendance/teachers/${teacherId}/reliability`)
      .then(setData)
      .catch((err) => setError(err.message))
  }, [teacherId])

  return (
    <Card className="mb-6 p-6">
      <h2 className="mb-1 flex items-center gap-2 font-semibold text-gray-900">
        <Gauge size={16} className="text-navy" />
        Fiabilité (3 derniers mois)
      </h2>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {data && data.sessions === 0 && <p className="text-sm text-gray-500">Aucune séance passée sur la période.</p>}
      {data && data.sessions > 0 && (
        <>
          <p className="mb-3 text-xs text-gray-500">
            {data.sessions} séance{data.sessions > 1 ? 's' : ''} passée{data.sessions > 1 ? 's' : ''} (hors annulations).
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Metric value={`${Math.round((data.pointed / data.sessions) * 100)} %`} label="Séances pointées" />
            <Metric value={data.neverPointed} label="Jamais pointées" alert={data.neverPointed > 0} />
            <Metric value={data.manual} label="Pointages hors scan QR" />
            <Metric
              value={data.late}
              label={`Arrivées en retard (+ de ${data.lateThresholdMinutes} min)`}
              alert={data.late > 0}
            />
            <Metric value={data.missingReports} label="Comptes-rendus manquants" alert={data.missingReports > 0} />
            <Metric
              value={data.avgReportDelayHours === null ? '—' : `${data.avgReportDelayHours} h`}
              label="Délai moyen du compte-rendu"
            />
          </div>
        </>
      )}
    </Card>
  )
}
