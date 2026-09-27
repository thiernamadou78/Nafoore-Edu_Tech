import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Star } from 'lucide-react'
import { api } from '../lib/api'
import { formatDate } from '../lib/format'
import { Card } from './ui/Card'

const PAGE = 5

function Stars({ value, size = 14 }) {
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={size} className={n <= Math.round(value) ? 'fill-gold-400 text-gold-400' : 'text-gray-200'} />
      ))}
    </span>
  )
}

// Avis laisses par les familles sur cet enseignant : moyenne, repartition
// des notes et detail (famille, eleve, commentaire).
export function TeacherReviewsCard({ teacherId }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [shown, setShown] = useState(PAGE)

  useEffect(() => {
    api
      .get(`/teachers/${teacherId}/reviews`)
      .then(setData)
      .catch((err) => setError(err.message))
  }, [teacherId])

  return (
    <Card className="mb-6 p-6">
      <h2 className="mb-4 flex items-center gap-2 font-semibold text-gray-900">
        <Star size={16} className="text-navy" />
        Avis des familles
        {data?.count > 0 && <span className="text-sm font-normal text-gray-400">({data.count})</span>}
      </h2>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {data && data.count === 0 && (
        <p className="text-sm text-gray-500">
          Aucun avis pour l'instant. Les familles peuvent noter l'enseignant après 2 séances réalisées.
        </p>
      )}

      {data?.count > 0 && (
        <>
          <div className="mb-5 flex flex-wrap items-center gap-6">
            <div className="text-center">
              <p className="font-serif text-4xl font-bold text-navy">{data.average.toFixed(1)}</p>
              <Stars value={data.average} />
              <p className="mt-1 text-xs text-gray-400">sur 5</p>
            </div>
            <div className="min-w-[180px] flex-1 space-y-1">
              {data.distribution.map(({ stars, count }) => (
                <div key={stars} className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="w-3 text-right">{stars}</span>
                  <Star size={11} className="fill-gold-400 text-gold-400" />
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={`h-full rounded-full ${stars <= 2 ? 'bg-red-400' : 'bg-gold-500'}`}
                      style={{ width: `${(count / data.count) * 100}%` }}
                    />
                  </div>
                  <span className="w-5 text-right">{count}</span>
                </div>
              ))}
            </div>
          </div>

          <ul className="divide-y divide-gray-100">
            {data.reviews.slice(0, shown).map((review) => (
              <li key={review.id} className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Stars value={review.rating} />
                    <span className="text-sm font-medium text-gray-800">{review.familyName}</span>
                    <span className="text-xs text-gray-500">
                      pour{' '}
                      {review.studentId ? (
                        <Link to={`/eleves/${review.studentId}`} className="text-navy hover:underline">
                          {review.studentName}
                        </Link>
                      ) : (
                        review.studentName
                      )}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {formatDate(review.updatedAt)}
                    {new Date(review.updatedAt) - new Date(review.createdAt) > 60000 ? ' (modifié)' : ''}
                  </span>
                </div>
                {review.comment && <p className="mt-1.5 text-sm text-gray-600">« {review.comment} »</p>}
              </li>
            ))}
          </ul>
          {data.reviews.length > shown && (
            <button
              type="button"
              onClick={() => setShown((n) => n + PAGE)}
              className="mt-2 text-sm font-medium text-navy hover:underline"
            >
              Voir plus d'avis
            </button>
          )}
        </>
      )}
    </Card>
  )
}
