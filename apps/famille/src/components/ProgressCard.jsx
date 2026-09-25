import { useEffect, useState } from 'react'
import { LineChart } from 'lucide-react'
import { api } from '../lib/api'
import { Card } from './ui/Card'
import { subjectPalette } from '../lib/subjectColors'

// Carte "Progression par matiere" : moyenne des notes avant l'accompagnement
// (barree) -> moyenne du dernier mois, sur 20. Notes saisies par l'enseignant.
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
  // Meme couleur par matiere que dans la liste des seances.
  const colorOf = subjectPalette([...sessions.map((s) => s.subject), ...subjects.map((s) => s.subject)])
  const doneBySubject = (subject) =>
    sessions.filter((s) => s.subject === subject && s.status === 'realisee').length

  return (
    <Card className="mb-6 p-5">
      <h2 className="mb-1 flex items-center gap-2 font-semibold text-gray-900">
        <LineChart size={16} className="text-gold-500" />
        Progression
      </h2>
      <p className="mb-4 text-xs text-gray-500">
        Moyenne des notes avant l'accompagnement, comparée à la moyenne du dernier mois
        d'évaluations (notes saisies par l'enseignant).
      </p>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {progress && subjects.length === 0 && (
        <p className="text-sm text-gray-500">
          La progression apparaîtra dès que l'enseignant aura saisi les notes de départ puis les
          premières évaluations.
        </p>
      )}


      {/* Une petite carte par matiere, chacune avec sa couleur */}
      <div className="grid gap-3 sm:grid-cols-2">
        {subjects.map((subject) => {
          const color = colorOf(subject.subject)
          const done = doneBySubject(subject.subject)
          const current = subject.latestAverage ?? subject.baselineAverage
          return (
            <div key={subject.subject} className={`rounded-xl border border-gray-100 p-3 ${color.soft}`}>
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-gray-900">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${color.dot}`} />
                  <span className="truncate">{subject.subject}</span>
                </span>
                {subject.delta !== null && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                      subject.delta >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {subject.delta >= 0 ? '↑' : '↓'} {Math.abs(subject.delta)} pts
                  </span>
                )}
              </div>
              <div className="mb-1.5 flex items-baseline gap-2">
                <span className="text-xs text-gray-400 line-through">{subject.baselineAverage}</span>
                {subject.latestAverage !== null ? (
                  <span className={`text-xl font-bold ${color.text}`}>
                    {subject.latestAverage}
                    <span className="text-xs font-normal text-gray-400">/20</span>
                  </span>
                ) : (
                  <span className="text-xs text-gray-400">en attente d'évaluation</span>
                )}
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white">
                <div className={`h-full rounded-full ${color.bar}`} style={{ width: `${(current / 20) * 100}%` }} />
              </div>
              {done > 0 && (
                <p className="mt-1.5 text-[11px] text-gray-500">
                  {done} séance{done > 1 ? 's' : ''} réalisée{done > 1 ? 's' : ''}
                </p>
              )}
            </div>
          )
        })}
      </div>

      {progress?.overall && (
        <div className="mt-4 flex items-center gap-3 rounded-xl bg-navy px-4 py-3 text-white">
          <div>
            <p className="text-xs text-white/60">Synthèse — moyenne générale, toutes matières</p>
            <p className="text-lg font-bold">
              <span className="mr-2 text-sm font-normal text-white/50 line-through">
                {progress.overall.baselineAverage}
              </span>
              {progress.overall.latestAverage}/20
            </p>
          </div>
          <span
            className={`ml-auto rounded-full px-3 py-1 text-sm font-bold ${
              progress.overall.delta >= 0 ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
            }`}
          >
            {progress.overall.delta >= 0 ? '↑' : '↓'} {Math.abs(progress.overall.delta)} pts
          </span>
        </div>
      )}

      {progress?.engagement?.length > 0 && (
        <div className="mt-4 rounded-xl border border-gray-100 p-3">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">
            Suivi des séances (compréhension / participation)
          </p>
          <ul className="space-y-1 text-xs text-gray-600">
            {progress.engagement.slice(-3).map((m) => (
              <li key={m.month} className="flex items-center justify-between gap-2">
                <span>
                  {new Date(`${m.month}-01`).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                </span>
                <span>
                  Compréhension {m.understanding ?? '—'}/5 · Participation {m.participation ?? '—'}/5
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  )
}
