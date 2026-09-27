import { useEffect, useId, useState } from 'react'
import { LineChart } from 'lucide-react'
import { api } from '../lib/api'
import { Card } from './ui/Card'
import { subjectPalette } from '../lib/subjectColors'

// Anneau de la moyenne generale (sur 20), comme la carte de la vitrine.
function Ring({ value, size = 84, stroke = 8 }) {
  const gradientId = useId()
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const pct = value === null ? 0 : Math.max(0, Math.min(1, value / 20))
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={stroke}
          strokeDasharray={circ}
          strokeDashoffset={circ - pct * circ}
          strokeLinecap="round"
        />
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FACC15" />
            <stop offset="100%" stopColor="#EAB308" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-serif text-lg font-bold leading-none text-white">
          {value === null ? '—' : value}
        </span>
        <span className="mt-0.5 text-[10px] text-white/50">/20</span>
      </div>
    </div>
  )
}

function Stat({ label, value, highlight }) {
  return (
    <div
      className={`flex-1 rounded-xl py-2 text-center ${
        highlight ? 'border border-gold-500/30 bg-gold-500/20' : 'bg-white/10'
      }`}
    >
      <p className={`text-sm font-bold ${highlight ? 'text-gold-400' : 'text-white'}`}>{value}</p>
      <p className="mt-0.5 text-[10px] text-white/50">{label}</p>
    </div>
  )
}

function formatHours(minutes) {
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  if (h === 0) return `${m} min`
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`
}

// Progression de l'enfant, sur le modele de la carte de la vitrine :
// synthese en haut (moyenne generale, heures, seances, progres, suivi des
// seances), puis la liste des matieres avec une barre de couleur chacune.
export function ProgressCard({
  studentId,
  endpoint = `/family/students/${studentId}/progress`,
  sessions = [],
}) {
  const [progress, setProgress] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    api
      .get(endpoint)
      .then(setProgress)
      .catch((err) => setError(err.message))
  }, [endpoint])

  const subjects = (progress?.subjects ?? []).filter((s) => s.baselineAverage !== null)
  const colorOf = subjectPalette([...sessions.map((s) => s.subject), ...subjects.map((s) => s.subject)])
  const done = sessions.filter((s) => s.status === 'realisee')
  const minutes = done.reduce((sum, s) => sum + (s.durationMinutes ?? 0), 0)
  const overall = progress?.overall ?? null
  const lastEngagement = progress?.engagement?.[progress.engagement.length - 1] ?? null

  return (
    <Card className="mb-6 overflow-hidden p-0">
      {/* ── Synthese ── */}
      <div className="bg-navy px-5 pb-4 pt-5 text-white">
        <h2 className="mb-4 flex items-center gap-2 font-semibold">
          <LineChart size={16} className="text-gold-400" />
          Progression
          {overall && (
            <span
              className={`ml-auto rounded-full px-2.5 py-1 text-xs font-semibold ${
                overall.delta >= 0 ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
              }`}
            >
              {overall.delta >= 0 ? 'En progrès' : 'En baisse'}
            </span>
          )}
        </h2>

        <div className="flex items-center gap-4">
          <Ring value={overall?.latestAverage ?? overall?.baselineAverage ?? null} />
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-[11px] uppercase tracking-wider text-white/50">
              Moyenne générale
              {overall && (
                <span className="ml-1 normal-case tracking-normal text-white/40">
                  (départ <span className="line-through">{overall.baselineAverage}</span>)
                </span>
              )}
            </p>
            <div className="flex gap-2">
              <Stat label="Heures" value={formatHours(minutes)} />
              <Stat label="Séances" value={done.length} />
              <Stat
                label="Progrès"
                value={overall ? `${overall.delta >= 0 ? '+' : ''}${overall.delta} pts` : '—'}
                highlight
              />
            </div>
            {lastEngagement && (
              <p className="text-[11px] text-white/60">
                Dernier mois : compréhension {lastEngagement.understanding ?? '—'}/5 · participation{' '}
                {lastEngagement.participation ?? '—'}/5
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Liste des matieres ── */}
      <div className="px-5 py-4">
        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">
          Progression par matière
        </p>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {progress && subjects.length === 0 && (
          <p className="text-sm text-gray-500">
            La progression apparaîtra dès que l'enseignant aura saisi les notes de départ puis les
            premières évaluations.
          </p>
        )}
        <div className="space-y-3">
          {subjects.map((subject) => {
            const color = colorOf(subject.subject)
            const current = subject.latestAverage ?? subject.baselineAverage
            return (
              <div key={subject.subject}>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1.5 text-xs font-semibold text-gray-700">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color.hex }} />
                    <span className="truncate">{subject.subject}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    <span className="text-[10px] text-gray-300 line-through">{subject.baselineAverage}</span>
                    {subject.latestAverage !== null ? (
                      <>
                        <span className="text-xs font-bold text-gray-700">{subject.latestAverage}/20</span>
                        <span
                          className={`text-[10px] font-bold ${subject.delta >= 0 ? 'text-green-500' : 'text-red-500'}`}
                        >
                          {subject.delta >= 0 ? '↑' : '↓'}
                          {Math.abs(subject.delta)}
                        </span>
                      </>
                    ) : (
                      <span className="text-[10px] text-gray-400">en attente d'évaluation</span>
                    )}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(current / 20) * 100}%`,
                      background: `linear-gradient(90deg, ${color.hex}88, ${color.hex})`,
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </Card>
  )
}
