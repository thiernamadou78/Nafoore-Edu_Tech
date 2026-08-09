import { useEffect, useState } from 'react'
import { Star } from 'lucide-react'
import { api } from '../lib/api'
import { Card } from '../components/ui/Card'
import { Spinner } from '../components/ui/Spinner'

function Stars({ rating }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={15}
          className={n <= rating ? 'fill-gold-400 text-gold-400' : 'text-gray-200'}
        />
      ))}
    </div>
  )
}

export function Avis() {
  const [reviews, setReviews] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    api
      .get('/teacher/reviews')
      .then(setReviews)
      .catch((err) => setError(err.message))
  }, [])

  if (error) return <p className="text-red-600">{error}</p>
  if (!reviews) return <Spinner />

  const average = reviews.length
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null

  return (
    <div>
      <div className="mb-6 flex items-baseline gap-3">
        <h1 className="font-serif text-2xl font-bold text-navy">Avis reçus</h1>
        {average && (
          <span className="flex items-center gap-1.5 text-sm text-gray-500">
            <Star size={14} className="fill-gold-400 text-gold-400" />
            {average} / 5 · {reviews.length} avis
          </span>
        )}
      </div>

      {reviews.length === 0 ? (
        <Card className="p-8 text-center text-sm text-gray-500">
          Aucun avis reçu pour l'instant.
        </Card>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <Card key={review.id} className="p-5">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{review.familyName}</p>
                  <p className="text-xs text-gray-500">à propos de {review.studentName}</p>
                </div>
                <Stars rating={review.rating} />
              </div>
              {review.comment && <p className="text-sm text-gray-700">{review.comment}</p>}
              <p className="mt-2 text-xs text-gray-400">
                {new Date(review.createdAt).toLocaleDateString('fr-FR', { dateStyle: 'long' })}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
