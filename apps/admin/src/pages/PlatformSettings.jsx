import { useEffect, useState } from 'react'
import { Clock, Globe2, Save, Settings } from 'lucide-react'
import { api } from '../lib/api'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'

const selectClass =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy'

function clockIn(tz) {
  try {
    return new Date().toLocaleString('fr-FR', {
      timeZone: tz,
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

// Reglages generaux reserves au Super Admin : fuseau horaire de la plateforme.
export function PlatformSettings() {
  const [data, setData] = useState(null)
  const [timezone, setTimezone] = useState('')
  const [realign, setRealign] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [, setTick] = useState(0)

  useEffect(() => {
    api
      .get('/admin/platform/timezone')
      .then((result) => {
        setData(result)
        setTimezone(result.timezone)
      })
      .catch((err) => setError(err.message))
    // Horloge rafraichie chaque minute.
    const id = setInterval(() => setTick((t) => t + 1), 30_000)
    return () => clearInterval(id)
  }, [])

  const save = async () => {
    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      const result = await api.patch('/admin/platform/timezone', { timezone, realign })
      setData((d) => ({ ...d, timezone: result.timezone }))
      const r = result.realigned
      setNotice(
        r
          ? `Fuseau enregistré. ${r.schedules} programme(s) recalé(s) : ${r.created} séance(s) à venir recalculée(s).`
          : 'Fuseau enregistré. Il s’applique aux nouveaux programmes et aux prochaines générations de séances.',
      )
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (!data) return error ? <Alert>{error}</Alert> : <p className="text-gray-500">Chargement…</p>

  const label = data.options.find((o) => o.value === timezone)?.label ?? timezone
  const changed = timezone !== data.timezone

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-center gap-2">
        <Settings size={20} className="text-navy" />
        <h1 className="text-xl font-semibold text-gray-900">Paramètres</h1>
      </div>

      {error && <Alert>{error}</Alert>}
      {notice && <Alert variant="success">{notice}</Alert>}

      <Card className="p-6">
        <h2 className="mb-1 flex items-center gap-2 font-semibold text-gray-900">
          <Globe2 size={16} className="text-navy" />
          Fuseau horaire de la plateforme
        </h2>
        <p className="mb-4 text-sm text-gray-500">
          Les créneaux des programmes (ex. « mardi 18:00 ») et les dates des emails sont
          interprétés dans ce fuseau, heure d'été / d'hiver comprises.
        </p>

        <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className={selectClass}>
          {data.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg bg-navy/5 px-4 py-3">
            <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-gray-500">
              <Clock size={12} />
              Heure actuelle — {label}
            </p>
            <p className="mt-1 text-lg font-semibold capitalize text-navy">{clockIn(timezone)}</p>
          </div>
          <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">
            Exemple : un créneau « mardi 18:00 » saisi par un enseignant = mardi 18:00 heure de{' '}
            <span className="font-medium">{label}</span>.
          </div>
        </div>

        <label className="mt-4 flex items-start gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={realign}
            onChange={(e) => setRealign(e.target.checked)}
            className="mt-0.5 rounded border-gray-300 text-navy focus:ring-navy"
          />
          <span>
            Recaler les séances à venir des programmes existants
            <span className="block text-xs text-gray-500">
              Les séances déplacées à la main, déjà pointées, à replanifier ou annulées ne sont pas
              touchées.
            </span>
          </span>
        </label>

        <div className="mt-5 flex justify-end">
          <Button icon={Save} loading={saving} onClick={save} disabled={!changed && !realign}>
            Enregistrer
          </Button>
        </div>
      </Card>
    </div>
  )
}
