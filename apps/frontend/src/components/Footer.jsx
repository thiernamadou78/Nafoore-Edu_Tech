import { Link } from 'react-router-dom'
import logoSrc from './IMG/Logo.png'

const NAV = [
  { href: '/#services', label: 'Services' },
  { href: '/#audience', label: 'Pour qui ?' },
  { href: '/#why-us', label: 'Pourquoi Nafoore' },
  { href: '/#contact', label: 'Contact' },
]

const SERVICES_LINKS = [
  'Aide aux devoirs',
  'Soutien scolaire',
  'Préparation Brevet & Bac',
  'Offre Mairie',
  'Centre de Formation / École Pro',
  'Offre CSE / Entreprises',
]

export default function Footer() {
  return (
    <footer className="bg-gray-950 text-white">
      {/* Bande dorée */}
      <div className="h-1 bg-gradient-to-r from-gold-500 via-gold-400 to-gold-500" />

      <div className="max-w-6xl mx-auto px-4 pt-14 pb-10">
        <div className="grid md:grid-cols-4 gap-10 mb-12">
          {/* Branding */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <img src={logoSrc} alt="Nafoore" className="w-9 h-9 object-contain" />
              <span className="font-serif text-lg font-bold">Nafoore</span>
            </div>
            <p className="font-sans text-gray-500 text-sm leading-relaxed">
              Soutien scolaire personnalisé pour les familles, mairies et entreprises.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-gray-600 mb-4">
              Navigation
            </h3>
            <ul className="space-y-2.5">
              {NAV.map(({ href, label }) => (
                <li key={href}>
                  <a
                    href={href}
                    className="font-sans text-sm text-gray-400 hover:text-gold-400 transition-colors"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
            <Link
              to="/devenir-enseignant"
              className="mt-4 inline-flex items-center gap-2 bg-gold-500/10 border border-gold-500/30 text-gold-400 font-sans text-sm font-semibold px-3.5 py-2 rounded-lg hover:bg-gold-500/20 hover:border-gold-500/50 transition-colors"
            >
              🎓 Devenir enseignant
            </Link>
          </div>

          {/* Services */}
          <div>
            <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-gray-600 mb-4">
              Services
            </h3>
            <ul className="space-y-2.5">
              {SERVICES_LINKS.map((s) => (
                <li key={s}>
                  <a
                    href="#services"
                    className="font-sans text-sm text-gray-400 hover:text-gold-400 transition-colors"
                  >
                    {s}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-gray-600 mb-4">
              Nous joindre
            </h3>
            <ul className="space-y-3">
              <li>
                <a
                  href="mailto:contact@nafoore.fr"
                  className="flex items-center gap-2.5 font-sans text-sm text-gray-400 hover:text-gold-400 transition-colors"
                >
                  <span className="w-7 h-7 bg-white/5 rounded-lg flex items-center justify-center text-xs">✉️</span>
                  contact@nafoore.fr
                </a>
              </li>
              <li>
                <a
                  href="tel:+33123456789"
                  className="flex items-center gap-2.5 font-sans text-sm text-gray-400 hover:text-gold-400 transition-colors"
                >
                  <span className="w-7 h-7 bg-white/5 rounded-lg flex items-center justify-center text-xs">📞</span>
                  01 23 45 67 89
                </a>
              </li>
              <li className="flex items-center gap-2.5 font-sans text-sm text-gray-400">
                <span className="w-7 h-7 bg-white/5 rounded-lg flex items-center justify-center text-xs">📍</span>
                Paris, Île-de-France
              </li>
            </ul>
          </div>
        </div>

        {/* Bas de footer */}
        <div className="border-t border-white/5 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="font-sans text-xs text-gray-600">
            © {new Date().getFullYear()} Nafoore — Tous droits réservés
          </p>
          <p className="font-sans text-xs text-gray-600">
            Fait avec ❤️ pour la réussite de chaque élève
          </p>
        </div>
      </div>
    </footer>
  )
}
