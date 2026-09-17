import { useEffect, useState } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

// Rotation de couleurs pour l'avatar (initiales) — le témoignage en base n'a
// pas besoin de stocker une couleur, juste de quoi rendre la grille vivante.
const AVATAR_COLORS = ['bg-blue-500', 'bg-gold-500', 'bg-violet-500', 'bg-emerald-500', 'bg-pink-500', 'bg-cyan-500']

function getInitials(name) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
}

function Stars({ count }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <svg key={i} className="w-4 h-4 text-gold-400 fill-current" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  )
}

export default function Testimonials() {
  const [testimonials, setTestimonials] = useState([])

  useEffect(() => {
    fetch(`${API_URL}/testimonials/public`)
      .then((res) => (res.ok ? res.json() : []))
      .then(setTestimonials)
      .catch(() => setTestimonials([]))
  }, [])

  if (testimonials.length === 0) return null

  return (
    <section className="py-24 bg-cream">
      <div className="max-w-6xl mx-auto px-4">
        {/* En-tête */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-gold-400/15 text-gold-600 font-sans text-xs font-bold uppercase tracking-widest px-3.5 py-1.5 rounded-full mb-5">
            <span className="w-1 h-1 bg-gold-500 rounded-full" />
            Témoignages
          </div>
          <h2 className="font-serif text-3xl lg:text-4xl font-bold text-navy mb-4">
            Ils nous font confiance
          </h2>
          <p className="font-sans text-gray-500 max-w-md mx-auto">
            Familles, collectivités, enseignants — leurs mots valent mieux que les nôtres.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {testimonials.map(({ id, quote, author, role, rating }, i) => (
            <div
              key={id}
              className="bg-white border border-gray-100 rounded-2xl p-7 flex flex-col shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200"
            >
              {/* Stars */}
              <Stars count={rating} />

              {/* Quote */}
              <p className="font-sans text-gray-600 text-sm leading-relaxed flex-1 my-5">
                "{quote}"
              </p>

              {/* Auteur */}
              <div className="flex items-center gap-3 pt-5 border-t border-gray-100">
                <div
                  className={`w-10 h-10 ${AVATAR_COLORS[i % AVATAR_COLORS.length]} rounded-full flex items-center justify-center flex-shrink-0`}
                >
                  <span className="font-sans text-white text-xs font-bold">{getInitials(author)}</span>
                </div>
                <div>
                  <div className="font-sans font-bold text-navy text-sm">{author}</div>
                  <div className="font-sans text-gray-400 text-xs">{role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
