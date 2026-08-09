import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarClock, FileWarning, GraduationCap, Sparkles, Users } from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Spinner } from '../components/ui/Spinner'
import { SESSION_STATUS_LABELS, SESSION_STATUS_TONES } from './labels'

function StatCard({ icon: Icon, label, value }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold-400/20 text-navy">
          <Icon size={18} />
        </div>
        <div>
          <p className="text-2xl font-bold text-navy">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </div>
    </Card>
  )
}

export function Dashboard() {
  const { teacherAccount } = useAuth()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [simulating, setSimulating] = useState(false)
  const [simResult, setSimResult] = useState(null)

  useEffect(() => {
    api
      .get('/teacher/dashboard')
      .then(setData)
      .catch((err) => setError(err.message))
  }, [])

  const handleSimulate = () => {
    setSimulating(true)
    setSimResult(null)
    api
      .post('/teacher/reminders/simulate')
      .then(setSimResult)
      .catch((err) => setError(err.message))
      .finally(() => setSimulating(false))
  }

  if (error) return <p className="text-red-600">{error}</p>
  if (!data) return <Spinner />

  return (
    <div>
      <h1 className="mb-1 font-serif text-2xl font-bold text-navy">
        Bonjour, {teacherAccount?.fullName} !
      </h1>
      <p className="mb-6 text-sm text-gray-500">Voici un résumé de ton activité.</p>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={Users} label="Élèves" value={data.studentsCount} />
        <StatCard icon={GraduationCap} label="Familles" value={data.familiesCount} />
        <StatCard icon={CalendarClock} label="Séances à venir" value={data.upcomingSessions.length} />
        <StatCard icon={FileWarning} label="Comptes-rendus en attente" value={data.pendingReportsCount} />
      </div>

      <Card className="mb-6 p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-semibold text-gray-900">
            <CalendarClock size={16} className="text-gold-500" />
            Prochaines séances
          </h2>
          <Link to="/planning" className="text-sm text-navy hover:underline">
            Voir le planning →
          </Link>
        </div>
        {data.upcomingSessions.length === 0 ? (
          <p className="text-sm text-gray-500">Aucune séance planifiée.</p>
        ) : (
          <div className="space-y-2">
            {data.upcomingSessions.map((session) => (
              <div key={session.id} className="flex items-center justify-between text-sm">
                <div>
                  <span className="font-medium text-gray-900">{session.studentName}</span>
                  {session.subject && <span className="ml-2 text-gray-500">{session.subject}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">
                    {new Date(session.date).toLocaleString('fr-FR', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </span>
                  <Badge tone={SESSION_STATUS_TONES[session.status] ?? 'gray'}>
                    {SESSION_STATUS_LABELS[session.status] ?? session.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="mb-2 flex items-center gap-2 font-semibold text-gray-900">
          <Sparkles size={16} className="text-gold-500" />
          Outils de démonstration
        </h2>
        <p className="mb-3 text-sm text-gray-500">
          En conditions réelles, un rappel serait envoyé automatiquement 24h après une séance
          sans compte-rendu. Ce bouton simule ce déclenchement immédiatement, pour test.
        </p>
        <Button disabled={simulating} onClick={handleSimulate}>
          Simuler l'envoi des rappels
        </Button>
        {simResult && (
          <p className="mt-3 text-sm text-gray-700">
            {simResult.candidates === 0
              ? "Aucune séance en attente de compte-rendu depuis plus de 24h."
              : `${simResult.sent} email(s) de rappel envoyé(s) sur ${simResult.candidates} séance(s) concernée(s).`}
          </p>
        )}
      </Card>
    </div>
  )
}
