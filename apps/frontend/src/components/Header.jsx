import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import logoSrc from './IMG/Logo.png'

const NAV_LINKS = [
  { href: '/#services', label: 'Services' },
  { href: '/#audience', label: 'Pour qui ?' },
  { href: '/#why-us', label: 'Pourquoi Nafoore' },
  { href: '/#contact', label: 'Contact' },
]

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-navy/95 backdrop-blur-md shadow-lg shadow-navy/30'
          : 'bg-navy'
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <img src={logoSrc} alt="Nafoore" className="w-10 h-10 object-contain drop-shadow-md" />
          <span className="font-serif text-lg font-bold text-white tracking-tight">Nafoore</span>
        </Link>

        {/* Nav desktop */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(({ href, label }) => (
            <a
              key={href}
              href={href}
              className="font-sans text-sm text-white/70 hover:text-white hover:bg-white/10 px-3.5 py-2 rounded-lg transition-all"
            >
              {label}
            </a>
          ))}
        </nav>

        {/* CTAs desktop */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            to="/devenir-enseignant"
            className="inline-flex items-center gap-2 border-2 border-gold-500/40 text-gold-400 font-sans font-bold text-sm px-4 py-2 rounded-full hover:border-gold-500 hover:bg-gold-500/10 transition-all"
          >
            <span>🎓</span>
            Devenir enseignant
          </Link>
          <a
            href="/#contact"
            className="inline-flex items-center gap-2 bg-gold-500 text-navy font-sans font-bold text-sm px-5 py-2.5 rounded-full hover:bg-gold-400 transition-all shadow-md hover:shadow-lg hover:shadow-gold-500/20 hover:-translate-y-0.5"
          >
            Inscrire un élève
            <span className="text-navy/60">→</span>
          </a>
        </div>

        {/* Burger mobile */}
        <button
          className="md:hidden w-9 h-9 flex items-center justify-center text-white rounded-lg hover:bg-white/10 transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? 'Fermer' : 'Menu'}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {mobileOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Menu mobile */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/10 bg-navy/98 px-4 pb-6">
          <nav className="flex flex-col gap-1 pt-3">
            {NAV_LINKS.map(({ href, label }) => (
              <a
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className="font-sans text-sm text-white/70 hover:text-white hover:bg-white/10 px-3 py-2.5 rounded-lg transition-all"
              >
                {label}
              </a>
            ))}
            <Link
              to="/devenir-enseignant"
              onClick={() => setMobileOpen(false)}
              className="mt-3 inline-flex items-center justify-center gap-2 border-2 border-gold-500/40 text-gold-400 font-sans font-bold text-sm px-5 py-2.5 rounded-full"
            >
              <span>🎓</span>
              Devenir enseignant
            </Link>
            <a
              href="/#contact"
              onClick={() => setMobileOpen(false)}
              className="mt-2 inline-flex items-center justify-center gap-2 bg-gold-500 text-navy font-sans font-bold text-sm px-5 py-2.5 rounded-full"
            >
              Inscrire un élève →
            </a>
          </nav>
        </div>
      )}
    </header>
  )
}
