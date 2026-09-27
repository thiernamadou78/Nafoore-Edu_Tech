import { useEffect, useState } from 'react'
import { MessageSquareHeart, Star } from 'lucide-react'
import { api } from '../lib/api'
import { Button } from './ui/Button'
import { Card } from './ui/Card'

const RATING_LABELS = { 1: 'Très déçu', 2: 'Déçu', 3: 'Correct', 4: 'Satisfait', 5: 'Excellent' }

function StarPicker({ value, onChange }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          aria-label={`${n} étoile${n > 1 ? 's' : ''}`}
          className="p-0.5"
        >
          <Star
            size={26}
            className={n <= (hover || value) ? 'fill-gold-400 text-gold-400' : 'text-gray-300'}
          />
        </button>
      ))}
      {(hover || value) > 0 && (
        <span className="ml-2 text-sm font-medium text-gray-600">{RATING_LABELS[hover || value]}</span>
      )}
    </div>
  )
}

function Stars({ value }) {
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={14} className={n <= value ? 'fill-gold-400 text-gold-400' : 'text-gray-200'} />
      ))}
    </span>
  )
}

function ReviewRow({ studentId, row, onSaved }) {
  const [editing, setEditing] = useState(false)
  const [rating, setRating] = useState(row.review?.rating ?? 0)
  const [comment, setComment] = useState(row.review?.comment ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      await api.put(`/family/students/${studentId}/reviews/${row.teacherId}`, {
        rating,
        comment: comment.trim() || undefined,
      })
      setEditing(false)
      await onSaved()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-lg border border-gray-100 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-800">
            {row.teacherName}
            {row.subjects.length > 0 && (
              <span className="font-normal text-gray-500"> · {row.subjects.join(', ')}</span>
            )}
          </p>
          {row.review && !editing && (
            <div className="mt-1 flex items-center gap-2">
              <Stars value={row.review.rating} />
              <span className="text-xs text-gray-400">
                le {new Date(row.review.updatedAt).toLocaleDateString('fr-FR')}
              </span>
            </div>
          )}
          {!row.canReview && (
            <p className="mt-0.5 text-xs text-gray-400">
              Vous pourrez donner votre avis après 2 séances réalisées.
            </p>
          )}
        </div>
        {row.canReview && !editing && (
          <Button variant="secondary" onClick={() => setEditing(true)}>
            {row.review ? 'Modifier mon avis' : 'Donner mon avis'}
          </Button>
        )}
      </div>

      {row.review?.comment && !editing && (
        <p className="mt-2 text-sm italic text-gray-600">« {row.review.comment} »</p>
      )}

      {editing && (
        <div className="mt-3 space-y-3 border-t border-gray-100 pt-3">
          <StarPicker value={rating} onChange={setRating} />
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="Votre avis (facultatif) : ponctualité, pédagogie, relation avec votre enfant…"
            className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
          />
          <p className="text-xs text-gray-400">
            Votre avis est transmis à l'équipe Nafoore et à l'enseignant ; il nous aide à garantir la
            qualité de l'accompagnement.
          </p>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <Button loading={saving} disabled={!rating} onClick={save}>
              Envoyer mon avis
            </Button>
            <Button variant="secondary" disabled={saving} onClick={() => setEditing(false)}>
              Annuler
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// Avis de la famille sur les enseignants de l'enfant (un par enseignant,
// modifiable), ouvert apres quelques seances realisees.
export function TeacherReviews({ studentId }) {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState(null)

  const load = () =>
    api
      .get(`/family/students/${studentId}/reviews`)
      .then(setRows)
      .catch((err) => setError(err.message))

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId])

  if (error) return null
  if (!rows || rows.length === 0) return null

  return (
    <Card className="mb-6 p-5">
      <h2 className="mb-1 flex items-center gap-2 font-semibold text-gray-900">
        <MessageSquareHeart size={16} className="text-gold-500" />
        Votre avis sur les enseignants
      </h2>
      <p className="mb-3 text-xs text-gray-500">
        Comment se passe l'accompagnement ? Vous pouvez modifier votre avis à tout moment.
      </p>
      <div className="space-y-2">
        {rows.map((row) => (
          <ReviewRow key={row.teacherId} studentId={studentId} row={row} onSaved={load} />
        ))}
      </div>
    </Card>
  )
}
