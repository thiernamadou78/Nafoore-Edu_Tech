import { useEffect, useState } from 'react'
import { Euro } from 'lucide-react'
import { api } from '../lib/api'
import { Badge } from '../components/ui/Badge'
import { Card } from '../components/ui/Card'
import { Spinner } from '../components/ui/Spinner'

const PAYMENT_STATUS_LABELS = { verse: 'Versé', en_attente: 'En attente' }
const PAYMENT_STATUS_TONES = { verse: 'sage', en_attente: 'amber' }

function formatEuros(value) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value)
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

  if (error) return <p className="text-red-600">{error}</p>
  if (!data) return <Spinner />

  return (
    <div>
      <h1 className="mb-6 font-serif text-2xl font-bold text-navy">Rémunération</h1>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs text-gray-500">Heures données ce mois-ci</p>
          <p className="mt-1 text-2xl font-bold text-navy">{data.hoursThisMonth} h</p>
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
                  <p className="text-gray-500">{payment.hoursGiven} h données</p>
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
