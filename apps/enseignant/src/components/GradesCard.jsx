import { useEffect, useState } from 'react'
import { LineChart, Trash2 } from 'lucide-react'
import { api } from '../lib/api'
import { formatDate } from '../lib/format'
import { Alert } from './ui/Alert'
import { Badge } from './ui/Badge'
import { Button } from './ui/Button'
import { Card } from './ui/Card'

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy'

const KIND_LABELS = { depart: 'Départ', suivi: 'Évaluation' }

const today = () => new Date().toISOString().slice(0, 10)

function formatMonth(month) {
  const [year, m] = month.split('-')
  return new Date(Number(year), Number(m) - 1, 1).toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  })
}

// Notes relevees sur Pronote : le prof est le seul a les saisir. Les notes de
// depart (avant l'accompagnement) sont obligatoires pour pouvoir cloturer une
// seance ; les evaluations suivantes alimentent la progression du mois.
export function GradesCard({ studentId, subjects }) {
  const [progress, setProgress] = useState(null)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    subject: '',
    kind: 'depart',
    value: '',
    scale: 20,
    evaluatedAt: today(),
    comment: '',
  })

  const load = () =>
    api
      .get(`/teacher/students/${studentId}/grades`)
      .then(setProgress)
      .catch((err) => setError(err.message))

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await api.post(`/teacher/students/${studentId}/grades`, {
        subject: form.subject,
        kind: form.kind,
        value: Number(form.value.toString().replace(',', '.')),
        scale: Number(form.scale),
        evaluatedAt: form.evaluatedAt,
        comment: form.comment || undefined,
      })
      setForm((f) => ({ ...f, value: '', comment: '' }))
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const removeGrade = async (gradeId) => {
    setError(null)
    try {
      await api.del(`/teacher/grades/${gradeId}`)
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  const withBaseline = new Set(
    (progress?.subjects ?? []).filter((s) => s.baselineAverage !== null).map((s) => s.subject),
  )
  const missingBaseline = subjects.filter((s) => !withBaseline.has(s))

  return (
    <Card className="mb-6 p-5">
      <h2 className="mb-1 flex items-center gap-2 font-semibold text-gray-900">
        <LineChart size={16} className="text-gold-500" />
        Notes et progression
      </h2>
      <p className="mb-4 text-xs text-gray-500">
        Note relevée sur Pronote (avec l'élève ou son parent). La progression compare la moyenne
        de départ à la moyenne du dernier mois.
      </p>

      {error && <Alert className="mb-3">{error}</Alert>}

      {missingBaseline.length > 0 && (
        <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Notes de départ manquantes : {missingBaseline.join(', ')}. Elles sont obligatoires pour
          clôturer une séance dans ces matières.
        </p>
      )}

      {progress && progress.overall && (
        <p className="mb-4 text-sm text-gray-700">
          Moyenne générale : {progress.overall.baselineAverage} → {progress.overall.latestAverage}/20{' '}
          <Badge tone={progress.overall.delta >= 0 ? 'green' : 'red'}>
            {progress.overall.delta >= 0 ? '+' : ''}
            {progress.overall.delta}
          </Badge>
        </p>
      )}

      {progress?.subjects.map((subject) => (
        <div key={subject.subject} className="mb-4 rounded-lg border border-gray-100">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-3 py-2">
            <p className="text-sm font-semibold text-gray-800">{subject.subject}</p>
            <p className="text-xs text-gray-600">
              {subject.baselineAverage !== null ? `Départ ${subject.baselineAverage}` : 'Pas de note de départ'}
              {subject.latestAverage !== null && ` → ${subject.latestAverage}/20`}
              {subject.delta !== null && (
                <span className={`ml-2 font-bold ${subject.delta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {subject.delta >= 0 ? '↑' : '↓'}
                  {Math.abs(subject.delta)}
                </span>
              )}
            </p>
          </div>
          {subject.months.length > 0 && (
            <p className="px-3 pt-2 text-[11px] text-gray-500">
              {subject.months.map((m) => `${formatMonth(m.month)} : ${m.average}/20`).join(' · ')}
            </p>
          )}
          <ul className="divide-y divide-gray-100 px-3 py-1">
            {subject.grades.map((grade) => (
              <li key={grade.id} className="flex items-center justify-between gap-2 py-1.5 text-xs">
                <span className="text-gray-700">
                  <Badge tone={grade.kind === 'depart' ? 'amber' : 'blue'}>{KIND_LABELS[grade.kind]}</Badge>{' '}
                  <span className="font-medium">
                    {grade.value}/{grade.scale}
                  </span>{' '}
                  · {formatDate(grade.evaluatedAt)}
                  {grade.comment ? ` · ${grade.comment}` : ''}
                </span>
                <button
                  type="button"
                  onClick={() => removeGrade(grade.id)}
                  aria-label="Supprimer la note"
                  className="text-gray-400 hover:text-red-600"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}

      <form onSubmit={handleSubmit} className="space-y-2 rounded-lg bg-gray-50 p-3">
        <p className="text-xs font-semibold text-gray-600">Ajouter une note</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <select
            required
            value={form.subject}
            onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
            className={inputClass}
          >
            <option value="">Matière…</option>
            {subjects.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </select>
          <select
            value={form.kind}
            onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value }))}
            className={inputClass}
          >
            <option value="depart">Note de départ (avant le prof)</option>
            <option value="suivi">Évaluation (avec le prof)</option>
          </select>
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <input
            required
            inputMode="decimal"
            value={form.value}
            onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
            placeholder="Note"
            className={inputClass}
          />
          <span className="text-sm text-gray-500">sur</span>
          <select
            value={form.scale}
            onChange={(e) => setForm((f) => ({ ...f, scale: Number(e.target.value) }))}
            className={inputClass}
          >
            {[20, 10, 40, 100].map((scale) => (
              <option key={scale} value={scale}>
                {scale}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            required
            type="date"
            max={today()}
            value={form.evaluatedAt}
            onChange={(e) => setForm((f) => ({ ...f, evaluatedAt: e.target.value }))}
            className={inputClass}
          />
          <input
            value={form.comment}
            onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))}
            maxLength={300}
            placeholder="Commentaire (facultatif)"
            className={inputClass}
          />
        </div>
        <Button type="submit" loading={saving}>
          Enregistrer la note
        </Button>
      </form>
    </Card>
  )
}
