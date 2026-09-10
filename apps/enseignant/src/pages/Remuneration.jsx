import { useEffect, useState } from 'react'
import { CalendarClock, Euro } from 'lucide-react'
import { api } from '../lib/api'
import { Badge } from '../components/ui/Badge'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { PaginationControls } from '../components/ui/PaginationControls'
import { Spinner } from '../components/ui/Spinner'
import { usePagination } from '../lib/usePagination'

const PAYMENT_STATUS_LABELS = { verse: 'Versé', en_attente: 'En attente' }
const PAYMENT_STATUS_TONES = { verse: 'sage', en_attente: 'amber' }

function formatEuros(value) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value)
}

// Format lisible pour un prof (jamais de décimales du type "0.78 h") : les
// minutes brutes viennent directement des pointages check-in/check-out.
function formatMinutes(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = Math.round(totalMinutes % 60)
  if (hours === 0) return `${minutes} min`
  if (minutes === 0) return `${hours} h`
  return `${hours} h ${String(minutes).padStart(2, '0')} min`
}

function formatTime(date) {
  return new Date(date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

export function Remuneration() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    api
      .get('/teacher/payments')
      .then(setData)
      .catch((err) => setError(err.message))
  }, [])

  const sessionsPage = usePagination(data?.sessionsThisMonth ?? [], 5)

  if (error) return <p className="text-red-600">{error}</p>
  if (!data) return <Spinner />

  return (
    <div>
      <h1 className="mb-6 font-serif text-2xl font-bold text-navy">Rémunération</h1>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs text-gray-500">Heures données ce mois-ci</p>
          <p className="mt-1 text-2xl font-bold text-navy">{formatMinutes(data.minutesThisMonth)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-gray-500">Montant estimé ce mois-ci</p>
          <p className="mt-1 text-2xl font-bold text-navy">{formatEuros(data.amountThisMonth)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-gray-500">Taux horaire</p>
          <p className="mt-1 text-2xl font-bold text-navy">{formatEuros(data.hourlyRate)}/h</p>
        </Card>
      </div>

      <Card className="mb-6 p-5">
        <h2 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
          <CalendarClock size={16} className="text-gold-500" />
          Séances réalisées ce mois-ci
        </h2>
        {data.sessionsThisMonth.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="Aucune séance réalisée ce mois-ci"
            description="Les séances pointées (arrivée + départ) apparaîtront ici avec leur durée."
          />
        ) : (
          <>
            <div className="divide-y divide-gray-100">
              {sessionsPage.visible.map((session) => (
                <div key={session.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-gray-900">
                      {session.studentName}
                      {session.subject && <span className="font-normal text-gray-500"> · {session.subject}</span>}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(session.date).toLocaleDateString('fr-FR', { dateStyle: 'medium' })}
                      {session.checkinAt && session.checkoutAt && (
                        <> · {formatTime(session.checkinAt)} – {formatTime(session.checkoutAt)}</>
                      )}
                    </p>
                  </div>
                  <Badge tone="gold">{formatMinutes(session.durationMinutes)}</Badge>
                </div>
              ))}
            </div>
            <PaginationControls
              {...sessionsPage}
              onShowMore={sessionsPage.showMore}
              onCollapse={sessionsPage.collapse}
              className="pt-3"
            />
          </>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
          <Euro size={16} className="text-gold-500" />
          Historique des versements
        </h2>
        {data.history.length === 0 ? (
          <p className="text-sm text-gray-500">Aucun versement pour l'instant.</p>
        ) : (
          <div className="space-y-2">
            {data.history.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between border-b border-gray-100 py-2 text-sm last:border-0"
              >
                <div>
                  <p className="font-medium text-gray-900">{payment.period}</p>
                  <p className="text-gray-500">{formatMinutes(payment.hoursGiven * 60)} données</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium text-gray-900">{formatEuros(payment.amount)}</span>
                  <Badge tone={PAYMENT_STATUS_TONES[payment.status] ?? 'gray'}>
                    {PAYMENT_STATUS_LABELS[payment.status] ?? payment.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
