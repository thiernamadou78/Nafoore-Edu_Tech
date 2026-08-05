const AUDIENCES = [
  {
    emoji: '👨‍👩‍👧',
    title: 'Familles',
    tagline: 'Le meilleur accompagnement pour votre enfant',
    bg: 'bg-navy',
    textColor: 'text-white',
    subColor: 'text-white/70',
    badgeBg: 'bg-gold-500 text-navy',
    borderColor: 'border-white/10',
    listColor: 'text-white/80',
    checkColor: 'text-gold-400',
    ctaBg: 'bg-gold-500 text-navy hover:bg-gold-400',
    features: [
      'Aide aux devoirs quotidienne',
      'Soutien scolaire personnalisé',
      'Préparation Brevet & Bac',
      'Coaching méthodologique',
      'Stages pendant les vacances',
    ],
  },
  {
    emoji: '🏛️',
    title: 'Mairies',
    tagline: 'Un partenaire de confiance pour la réussite éducative',
    bg: 'bg-white',
    textColor: 'text-navy',
    subColor: 'text-gray-500',
    badgeBg: 'bg-navy text-white',
    borderColor: 'border-gray-100',
    listColor: 'text-gray-600',
    checkColor: 'text-gold-500',
    ctaBg: 'bg-navy text-white hover:bg-navy/90',
    features: [
      'Dispositifs QPV & REP',
      'Ateliers collectifs d\'aide aux devoirs',
      'Suivi individualisé des élèves',
      'Bilans réguliers aux services municipaux',
      'Tarification sociale adaptée',
    ],
  },
  {
    emoji: '🏢',
    title: 'Entreprises & CSE',
    tagline: 'Un avantage salarial qui fait vraiment la différence',
    bg: 'bg-gray-50',
    textColor: 'text-navy',
    subColor: 'text-gray-500',
    badgeBg: 'bg-gray-800 text-white',
    borderColor: 'border-gray-200',
    listColor: 'text-gray-600',
    checkColor: 'text-gold-500',
    ctaBg: 'bg-navy text-white hover:bg-navy/90',
    features: [
      'Chèques éducatifs pour salariés',
      'Avantages familiaux attractifs',
      'Plateforme de suivi dédiée',
      'Offres tarifaires négociées',
      'Bilan annuel d\'impact RSE',
    ],
  },
  {
    emoji: '🎓',
    title: 'Centres de Formation & Écoles Pro',
    tagline: 'Un accompagnement sur mesure pour vos apprenants',
    bg: 'bg-indigo-50',
    textColor: 'text-navy',
    subColor: 'text-gray-500',
    badgeBg: 'bg-indigo-600 text-white',
    borderColor: 'border-indigo-100',
    listColor: 'text-gray-600',
    checkColor: 'text-gold-500',
    ctaBg: 'bg-navy text-white hover:bg-navy/90',
    features: [
      'Remise à niveau ciblée par module et par cohorte',
      'Suivi individualisé des apprenants',
      'Ateliers de préparation aux examens',
      'Reporting pédagogique régulier',
      'Tarifs adaptés aux organismes',
    ],
  },
]

export default function Audience() {
  return (
    <section id="audience" className="py-24 bg-cream">
      <div className="max-w-6xl mx-auto px-4">
        {/* En-tête */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-gold-400/15 text-gold-600 font-sans text-xs font-bold uppercase tracking-widest px-3.5 py-1.5 rounded-full mb-5">
            <span className="w-1 h-1 bg-gold-500 rounded-full" />
            Pour qui ?
          </div>
          <h2 className="font-serif text-3xl lg:text-4xl font-bold text-navy mb-4">
            Des solutions pour chaque acteur
          </h2>
          <p className="font-sans text-gray-500 max-w-lg mx-auto">
            Nafoore s'adapte à tous les contextes : familles individuelles,
            collectivités locales, comités d'entreprise ou organismes de formation.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {AUDIENCES.map(({ emoji, title, tagline, bg, textColor, subColor, badgeBg, borderColor, listColor, checkColor, ctaBg, features }) => (
            <div
              key={title}
              className={`${bg} border ${borderColor} rounded-2xl p-7 flex flex-col shadow-sm hover:shadow-xl transition-shadow duration-300`}
            >
              {/* Badge + emoji */}
              <div className="flex items-center justify-between mb-5">
                <span className={`font-sans text-xs font-bold px-3 py-1 rounded-full ${badgeBg}`}>
                  {title}
                </span>
                <span className="text-2xl">{emoji}</span>
              </div>

              {/* Tagline */}
              <h3 className={`font-serif text-lg font-bold ${textColor} mb-1.5 leading-snug`}>
                {tagline}
              </h3>
              <p className={`font-sans text-xs ${subColor} mb-6`}>
                Accompagnement clé en main
              </p>

              {/* Features */}
              <ul className="space-y-2.5 mb-7 flex-1">
                {features.map((f) => (
                  <li key={f} className={`flex items-start gap-2.5 font-sans text-sm ${listColor}`}>
                    <span className={`${checkColor} mt-0.5 text-xs`}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <a
                href="#contact"
                className={`inline-flex items-center justify-center gap-2 font-sans text-sm font-bold px-5 py-3 rounded-full transition-all ${ctaBg}`}
              >
                Nous contacter →
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
