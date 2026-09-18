import { useMemo, useState } from 'react'
import { CalendarPlus, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from './ui/Button'
import { Card } from './ui/Card'

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

const dayKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1)

function dotColor(session) {
  if (session.status === 'annulee') return 'bg-red-500'
  if (session.status === 'realisee') return 'bg-green-500'
  if (new Date(session.date) < new Date()) return 'bg-amber-500'
  return 'bg-blue-500'
}

// Grille du mois façon agenda de téléphone : pastilles colorées sous les
// jours qui ont des séances, et un clic sur un jour affiche l'agenda du jour.
export function PlanningCalendar({ sessions, renderSession, renderCreateForm }) {
  const today = new Date()
  const [month, setMonth] = useState(startOfMonth(today))
  const [selected, setSelected] = useState(today)
  const [creating, setCreating] = useState(false)

  const byDay = useMemo(() => {
    const map = new Map()
    for (const session of sessions) {
      const key = dayKey(new Date(session.date))
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(session)
    }
    for (const list of map.values()) {
      list.sort((a, b) => new Date(a.date) - new Date(b.date))
    }
    return map
  }, [sessions])

  // Semaine commençant le lundi : on complète avec les jours des mois voisins.
  const cells = useMemo(() => {
    const first = startOfMonth(month)
    const offset = (first.getDay() + 6) % 7
    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
    const total = Math.ceil((offset + daysInMonth) / 7) * 7
    return Array.from({ length: total }, (_, i) => new Date(first.getFullYear(), first.getMonth(), i - offset + 1))
  }, [month])

  const goToMonth = (delta) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1))
  const goToToday = () => {
    setMonth(startOfMonth(new Date()))
    setSelected(new Date())
  }

  const selectedSessions = byDay.get(dayKey(selected)) ?? []
  const monthLabel = month.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  const selectedLabel = selected.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,420px)_1fr]">
      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-serif text-lg font-bold capitalize text-navy">{monthLabel}</h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={goToToday}
              className="rounded-full px-2.5 py-1 text-xs font-medium text-navy hover:bg-navy/5"
            >
              Aujourd'hui
            </button>
            <button
              type="button"
              onClick={() => goToMonth(-1)}
              aria-label="Mois précédent"
              className="rounded-full p-1.5 text-gray-500 hover:bg-gray-100"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => goToMonth(1)}
              aria-label="Mois suivant"
              className="rounded-full p-1.5 text-gray-500 hover:bg-gray-100"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 text-center text-[11px] font-medium uppercase text-gray-400">
          {WEEKDAYS.map((day) => (
            <div key={day} className="py-1">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-y-1">
          {cells.map((date) => {
            const key = dayKey(date)
            const daySessions = byDay.get(key) ?? []
            const inMonth = date.getMonth() === month.getMonth()
            const isToday = key === dayKey(today)
            const isSelected = key === dayKey(selected)
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setSelected(date)
                  setCreating(false)
                  if (!inMonth) setMonth(startOfMonth(date))
                }}
                className="flex flex-col items-center gap-0.5 py-1"
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm ${
                    isSelected
                      ? 'bg-navy font-semibold text-white'
                      : isToday
                        ? 'font-semibold text-navy ring-1 ring-navy'
                        : inMonth
                          ? 'text-gray-800 hover:bg-gray-100'
                          : 'text-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {date.getDate()}
                </span>
                <span className="flex h-1.5 items-center gap-0.5">
                  {daySessions.slice(0, 3).map((session) => (
                    <span key={session.id} className={`h-1.5 w-1.5 rounded-full ${dotColor(session)}`} />
                  ))}
                </span>
              </button>
            )
          })}
        </div>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-gray-100 pt-3 text-[11px] text-gray-500">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-blue-500" /> À venir
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-500" /> À confirmer
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-green-500" /> Réalisée
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-red-500" /> Annulée
          </span>
        </div>
      </Card>

      <div>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold capitalize text-gray-700">
            {selectedLabel}
            <span className="ml-2 font-normal text-gray-400">
              {selectedSessions.length === 0
                ? ''
                : `${selectedSessions.length} séance${selectedSessions.length > 1 ? 's' : ''}`}
            </span>
          </h3>
          {renderCreateForm && !creating && (
            <Button variant="secondary" icon={CalendarPlus} onClick={() => setCreating(true)}>
              Planifier
            </Button>
          )}
        </div>
        {creating &&
          renderCreateForm({ day: dayKey(selected), onClose: () => setCreating(false) })}
        {selectedSessions.length === 0 ? (
          <Card className="p-6 text-center text-sm text-gray-400">Aucune séance ce jour.</Card>
        ) : (
          <div className="space-y-3">
            {selectedSessions.map((session) => (
              <div key={session.id}>{renderSession(session)}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
