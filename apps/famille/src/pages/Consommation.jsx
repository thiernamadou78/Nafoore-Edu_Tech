import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, Wallet } from 'lucide-react'
import { api } from '../lib/api'
import { useAutoRefresh } from '../lib/useAutoRefresh'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { Spinner } from '../components/ui/Spinner'

function getInitials(name) {
  return (name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
}

// Format lisible ("1 h 30 min") plutot que des minutes ou des decimales.
function formatDuration(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = Math.round(totalMinutes % 60)
  if (hours === 0) return `${minutes} min`
  if (minutes === 0) return `${hours} h`
  return `${hours} h ${String(minutes).padStart(2, '0')} min`
}

const euros = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
const formatEuros = (value) => euros.format(value ?? 0)

const monthKey = (date) => {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
const monthLabel = (key) => {
  const [year, month] = key.split('-').map(Number)
  const label = new Date(year, month - 1, 1).toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

const sumMinutes = (rows) => rows.reduce((sum, r) => sum + r.minutes, 0)
const sumAmount = (rows) => Math.round(rows.reduce((sum, r) => sum + (r.amount ?? 0), 0) * 100) / 100

// Regroupe les seances par enseignant + matiere (une ligne par accompagnement).
function groupLines(rows) {
  const lines = new Map()
  for (const row of rows) {
    const key = `${row.teacherName}|${row.subject}`
    const line = lines.get(key) ?? {
      key,
      teacherName: row.teacherName,
      subject: row.subject,
      minutes: 0,
      amount: 0,
      rates: new Set(),
      unpriced: 0,
    }
    line.minutes += row.minutes
    line.amount += row.amount ?? 0
    if (row.hourlyRate) line.rates.add(row.hourlyRate)
    else line.unpriced += 1
    lines.set(key, line)
  }
  return [...lines.values()].sort((a, b) => b.minutes - a.minutes)
}

function ChildCard({ child, rows }) {
  const [open, setOpen] = useState(false)
  const lines = groupLines(rows)
  const unpriced = rows.filter((r) => !r.hourlyRate).length

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <Link to={`/eleves/${child.id}`} className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-navy font-medium text-gold-400">
            {child.photoUrl ? (
              <img src={child.photoUrl} alt={child.name} className="h-full w-full object-cover" />
            ) : (
              getInitials(child.name)
            )}
          </span>
          <span className="font-semibold text-gray-900 hover:underline">{child.name}</span>
        </Link>
        <div className="text-right">
          <p className="text-lg font-bold text-navy">{formatEuros(sumAmount(rows))}</p>
          <p className="text-xs text-gray-500">{formatDuration(sumMinutes(rows))}</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="border-t border-gray-100 pt-3 text-sm text-gray-500">
          Aucune séance sur cette période.
        </p>
      ) : (
        <>
          <ul className="space-y-2 border-t border-gray-100 pt-3 text-sm">
            {lines.map((line) => (
              <li key={line.key} className="flex items-start justify-between gap-3">
                <span className="text-gray-700">
                  <span className="font-medium text-gray-900">{line.subject}</span>
                  <span className="block text-xs text-gray-500">
                    {line.teacherName} ·{' '}
                    {line.rates.size > 0
                      ? [...line.rates].map((rate) => `${formatEuros(rate)}/h`).join(', ')
                      : 'tarif non défini'}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-medium text-gray-900">{formatEuros(line.amount)}</span>
                  <span className="block text-xs text-gray-500">{formatDuration(line.minutes)}</span>
                </span>
              </li>
            ))}
          </ul>

          {unpriced > 0 && (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {unpriced} séance{unpriced > 1 ? 's' : ''} sans tarif défini : non comptée
              {unpriced > 1 ? 's' : ''} dans le montant. Notre équipe s'en occupe.
            </p>
          )}

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-navy hover:underline"
          >
            <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
            {open ? 'Masquer le détail des séances' : `Voir le détail (${rows.length} séance${rows.length > 1 ? 's' : ''})`}
          </button>
          {open && (
            <table className="mt-2 w-full text-xs">
              <thead className="text-left text-gray-400">
                <tr>
                  <th className="py-1 font-medium">Date</th>
                  <th className="py-1 font-medium">Matière</th>
                  <th className="py-1 text-right font-medium">Durée</th>
                  <th className="py-1 text-right font-medium">Montant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="py-1.5">{new Date(row.date).toLocaleDateString('fr-FR')}</td>
                    <td className="py-1.5">{row.subject}</td>
                    <td className="py-1.5 text-right">{formatDuration(row.minutes)}</td>
                    <td className="py-1.5 text-right">
                      {row.amount === null ? '—' : formatEuros(row.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </Card>
  )
}

export function Consommation() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [period, setPeriod] = useState(() => monthKey(new Date()))

  useEffect(() => {
    api
      .get('/family/hours')
      .then(setData)
      .catch((err) => setError(err.message))
  }, [])

  useAutoRefresh(() => {
    api.get('/family/hours').then(setData).catch(() => {})
  })

  // Mois disponibles : le mois en cours + tous ceux qui ont des seances.
  const months = useMemo(() => {
    const keys = new Set([monthKey(new Date())])
    for (const child of data?.children ?? []) {
      for (const session of child.sessions) keys.add(monthKey(session.date))
    }
    return [...keys].sort().reverse()
  }, [data])

  if (error) return <p className="text-red-600">{error}</p>
  if (!data) return <Spinner />

  const inPeriod = (rows) =>
    period === 'all' ? rows : rows.filter((row) => monthKey(row.date) === period)
  const allRows = data.children.flatMap((child) => inPeriod(child.sessions))
  const hasAnySession = data.children.some((child) => child.sessions.length > 0)

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Wallet size={20} className="text-gold-500" />
          <h1 className="font-serif text-2xl font-bold text-navy">Consommation</h1>
        </div>
        {hasAnySession && (
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
          >
            {months.map((key) => (
              <option key={key} value={key}>
                {monthLabel(key)}
              </option>
            ))}
            <option value="all">Depuis le début</option>
          </select>
        )}
      </div>

      <Card className="mb-6 p-5">
        <p className="text-xs text-gray-500">
          Total pour tous les enfants — {period === 'all' ? 'depuis le début' : monthLabel(period).toLowerCase()}
        </p>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <p className="text-3xl font-bold text-navy">{formatEuros(sumAmount(allRows))}</p>
          <p className="text-sm text-gray-500">
            {formatDuration(sumMinutes(allRows))} · {allRows.length} séance{allRows.length > 1 ? 's' : ''}
          </p>
        </div>
        <p className="mt-2 text-xs text-gray-400">
          Séances réalisées et pointées (arrivée + départ enregistrés), au tarif horaire de
          l'enseignant.
        </p>
      </Card>

      {!hasAnySession ? (
        <Card className="p-8">
          <EmptyState
            icon={Wallet}
            title="Aucune séance réalisée pour l'instant"
            description="Votre consommation apparaîtra ici dès qu'une séance aura été pointée du début à la fin."
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {data.children.map((child) => (
            <ChildCard key={child.id} child={child} rows={inPeriod(child.sessions)} />
          ))}
        </div>
      )}
    </div>
  )
}
