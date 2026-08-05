import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  CalendarClock,
  GraduationCap,
  Inbox,
  Smile,
  TrendingUp,
  Users,
} from 'lucide-react'
import { api } from '../lib/api'
import { Badge } from '../components/ui/Badge'
import { Card } from '../components/ui/Card'
import { PROFILE_LABELS } from './leads/statusLabels'
import { STATUS_LABELS as APPLICATION_STATUS_LABELS } from './recruitment/statusLabels'

function formatDaysSince(dateString) {
  const days = Math.floor(
    (Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24),
  )
  return days <= 0 ? "aujourd'hui" : `il y a ${days} j`
}

function StatTile({ label, value, icon: Icon, comingSoon }) {
  return (
    <Card className="p-6">
      <div className="flex items-start justify-between">
        <p className="text-sm text-gray-500">{label}</p>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy/5 text-navy">
          <Icon size={16} />
        </div>
      </div>
      {comingSoon ? (
        <Badge tone="gray" className="mt-3">
          Bientôt disponible
        </Badge>
      ) : (
        <p className="mt-1 text-3xl font-semibold text-gray-900">{value}</p>
      )}
    </Card>
  )
}

export function Dashboard() {
  const [summary, setSummary] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    api
      .get('/dashboard')
      .then(setSummary)
      .catch((err) => setError(err.message))
  }, [])

  if (error) return <p className="text-red-600">{error}</p>
  if (!summary) return <p className="text-gray-500">Chargement…</p>

  const profileEntries = Object.entries(summary.studentsByProfile).filter(
    ([, count]) => count > 0,
  )
  const maxProfileCount = Math.max(1, ...profileEntries.map(([, count]) => count))

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-gray-900">Tableau de bord</h1>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Élèves actifs" value={summary.activeStudents} icon={Users} />
        <StatTile label="Leads ce mois-ci" value={summary.leadsThisMonth} icon={Inbox} />
        <StatTile
          label="Taux de conversion lead → inscription"
          value={`${Math.round(summary.conversionRate * 100)}%`}
          icon={TrendingUp}
        />
        <StatTile label="Taux de satisfaction" icon={Smile} comingSoon />
      </div>

      <Card className="mb-6 p-6">
        <h2 className="mb-4 flex items-center gap-2 font-semibold text-gray-900">
          <GraduationCap size={16} className="text-navy" />
          Élèves par profil
        </h2>
        {profileEntries.length === 0 ? (
          <p className="text-sm text-gray-500">Aucun élève pour l'instant.</p>
        ) : (
          <div className="space-y-3">
            {profileEntries.map(([profile, count]) => (
              <div key={profile} className="flex items-center gap-3">
                <span className="w-24 shrink-0 text-sm text-gray-600">
                  {PROFILE_LABELS[profile] ?? profile}
                </span>
                <div className="h-6 flex-1 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-6 rounded-full bg-navy"
                    style={{ width: `${(count / maxProfileCount) * 100}%` }}
                  />
                </div>
                <span className="w-8 shrink-0 text-right text-sm text-gray-700">{count}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
            <AlertTriangle size={16} className="text-amber-500" />
            Leads non traités
          </h2>
          {summary.alerts.staleLeads.length === 0 ? (
            <p className="text-sm text-gray-500">Rien à signaler.</p>
          ) : (
            <ul className="space-y-2">
              {summary.alerts.staleLeads.map((lead) => (
                <li key={lead.id} className="flex justify-between text-sm">
                  <Link to={`/leads/${lead.id}`} className="text-navy hover:underline">
                    {lead.name}
                  </Link>
                  <span className="text-gray-500">{formatDaysSince(lead.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
            <AlertTriangle size={16} className="text-amber-500" />
            Candidatures en attente
          </h2>
          {summary.alerts.pendingTeacherApplications.length === 0 ? (
            <p className="text-sm text-gray-500">Rien à signaler.</p>
          ) : (
            <ul className="space-y-2">
              {summary.alerts.pendingTeacherApplications.map((application) => (
                <li key={application.id} className="flex justify-between text-sm">
                  <Link
                    to={`/recrutement/${application.id}`}
                    className="text-navy hover:underline"
                  >
                    {application.candidateName}
                  </Link>
                  <span className="text-gray-500">
                    {APPLICATION_STATUS_LABELS[application.status] ?? application.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-6 lg:col-span-2">
          <h2 className="mb-2 flex items-center gap-2 font-semibold text-gray-900">
            <CalendarClock size={16} className="text-gray-400" />
            Séances à venir non confirmées
          </h2>
          <Badge tone="gray">Bientôt disponible — nécessite le module Planning</Badge>
        </Card>
      </div>
    </div>
  )
}
