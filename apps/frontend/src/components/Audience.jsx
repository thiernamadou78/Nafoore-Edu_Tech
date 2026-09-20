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
    description:
      "Votre commune finance l'accompagnement scolaire des enfants de ses habitants. Nous fournissons les enseignants vérifiés, gérons les inscriptions et vous rendons compte de l'utilisation et des résultats.",
    steps: [
      'Nous définissons ensemble le dispositif : public visé (QPV, REP…), volume d\'heures et période.',
      'Les familles bénéficiaires sont inscrites : chaque enfant reçoit un enseignant et un Pass Éducatif (QR code) pour valider chaque séance.',
      'Vos services municipaux suivent la présence et la progression grâce à des bilans réguliers.',
    ],
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
    description:
      "Votre entreprise ou votre CSE prend en charge, en totalité ou en partie, le soutien scolaire des enfants de ses salariés : un avantage concret pour les familles, sans gestion pour vous.",
    steps: [
      'Vous choisissez une formule (volume d\'heures, matières, durée) adaptée à votre budget.',
      'Vos salariés bénéficiaires sont inscrits ; ils demandent un enseignant depuis leur espace famille.',
      'Un espace de suivi dédié vous montre l\'utilisation du dispositif, avec un bilan annuel d\'impact RSE.',
    ],
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
    badgeBg: 'bg-[#2e4d70] text-white',
    borderColor: 'border-indigo-100',
    listColor: 'text-gray-600',
    checkColor: 'text-gold-500',
    ctaBg: 'bg-navy text-white hover:bg-navy/90',
    description:
      "Nous complétons votre pédagogie avec des enseignants qui remettent vos apprenants à niveau et les préparent à leurs examens, sur les modules et les cohortes que vous choisissez.",
    steps: [
      'Vous nous indiquez les modules, les cohortes et les objectifs à atteindre.',
      'Nos enseignants interviennent en petits groupes ou en individuel.',
      'Vous recevez un reporting pédagogique régulier sur la progression de chaque apprenant.',
    ],
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
            Nafoore Education s'adapte à tous les contextes : familles individuelles,
            collectivités locales, comités d'entreprise ou organismes de formation.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {AUDIENCES.map(({ emoji, title, tagline, description, steps, bg, textColor, subColor, badgeBg, borderColor, listColor, checkColor, ctaBg, features }) => (
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
              <p className={`font-sans text-xs ${subColor} mb-4`}>
                Accompagnement clé en main
              </p>

              {description && (
                <p className={`font-sans text-sm leading-relaxed ${listColor} mb-5`}>
                  {description}
                </p>
              )}

              {/* Features */}
              <ul className="space-y-2.5 mb-7 flex-1">
                {features.map((f) => (
                  <li key={f} className={`flex items-start gap-2.5 font-sans text-sm ${listColor}`}>
                    <span className={`${checkColor} mt-0.5 text-xs`}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              {steps && (
                <div className={`mb-7 rounded-xl border ${borderColor} p-4`}>
                  <p className={`font-sans text-xs font-bold uppercase tracking-wider ${subColor} mb-3`}>
                    Comment ça marche
                  </p>
                  <ol className="space-y-2.5">
                    {steps.map((step, index) => (
                      <li key={step} className={`flex items-start gap-3 font-sans text-sm ${listColor}`}>
                        <span className={`${badgeBg} flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold`}>
                          {index + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

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
