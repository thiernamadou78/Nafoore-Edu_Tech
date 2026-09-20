import { useEffect, useState } from 'react'
import { LineChart } from 'lucide-react'
import { api } from '../lib/api'
import { Card } from './ui/Card'

// Carte "Progression par matiere" : moyenne des notes avant l'accompagnement
// (barree) -> moyenne du dernier mois, sur 20. Notes saisies par l'enseignant.
export function StudentProgressCard({ studentId }) {
  const endpoint = `/students/${studentId}/progress`
  const [progress, setProgress] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    api
      .get(endpoint)
      .then(setProgress)
      .catch((err) => setError(err.message))
  }, [endpoint])

  const subjects = (progress?.subjects ?? []).filter((s) => s.baselineAverage !== null)

  return (
    <Card className="mb-6 p-5">
      <h2 className="mb-1 flex items-center gap-2 font-semibold text-gray-900">
        <LineChart size={16} className="text-gold-500" />
        Progression par matière
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

      {progress?.overall && (
        <div className="mb-4 flex items-center gap-3 rounded-xl bg-navy px-4 py-3 text-white">
          <div>
            <p className="text-xs text-white/60">Moyenne générale</p>
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

      <div className="space-y-3">
        {subjects.map((subject) => (
          <div key={subject.subject}>
            <div className="mb-1 flex items-center justify-between gap-2 text-sm">
              <span className="font-medium text-gray-800">{subject.subject}</span>
              <span className="flex items-center gap-2">
                <span className="text-xs text-gray-300 line-through">{subject.baselineAverage}</span>
                {subject.latestAverage !== null ? (
                  <>
                    <span className="text-xs font-bold text-gray-700">{subject.latestAverage}/20</span>
                    <span
                      className={`text-[11px] font-bold ${
                        subject.delta >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {subject.delta >= 0 ? '↑' : '↓'}
                      {Math.abs(subject.delta)}
                    </span>
                  </>
                ) : (
                  <span className="text-xs text-gray-400">en attente d'évaluation</span>
                )}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-gold-500"
                style={{ width: `${((subject.latestAverage ?? subject.baselineAverage) / 20) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
