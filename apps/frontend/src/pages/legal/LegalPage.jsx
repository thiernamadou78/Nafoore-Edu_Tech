import { useEffect } from 'react'
import { Link } from 'react-router-dom'

const LINKS = [
  { to: '/mentions-legales', label: 'Mentions légales' },
  { to: '/cgu', label: 'Conditions générales d’utilisation' },
  { to: '/confidentialite', label: 'Politique de confidentialité' },
]

// Mise en page commune des pages legales : titre, date de mise a jour,
// navigation entre les trois documents et corps de texte lisible.
export function LegalPage({ title, updatedAt, current, children }) {
  useEffect(() => {
    document.title = `${title} — Nafoore Education`
  }, [title])

  return (
    <div className="bg-cream">
      <section className="bg-navy px-4 pb-12 pt-10 text-white">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-serif text-3xl font-bold sm:text-4xl">{title}</h1>
          {updatedAt && <p className="mt-2 font-sans text-sm text-white/60">Dernière mise à jour : {updatedAt}</p>}
          <nav className="mt-6 flex flex-wrap gap-2">
            {LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`rounded-full px-3.5 py-1.5 font-sans text-xs font-semibold transition-colors ${
                  current === link.to
                    ? 'bg-gold-500 text-navy'
                    : 'bg-white/10 text-white/80 hover:bg-white/20'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </section>
      <article className="legal-content mx-auto max-w-3xl px-4 py-10 font-sans text-[15px] leading-relaxed text-gray-700">
        {children}
      </article>
    </div>
  )
}

// Titre de section numerote.
export function Section({ id, title, children }) {
  return (
    <section id={id} className="mb-8 scroll-mt-24">
      <h2 className="mb-3 font-serif text-xl font-bold text-navy">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  )
}
