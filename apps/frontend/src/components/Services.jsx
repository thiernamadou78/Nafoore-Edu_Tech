const SERVICES = [
  {
    icon: '📚',
    title: 'Aide aux devoirs',
    desc: 'Accompagnement quotidien du soir, du CP à la Terminale.',
    accent: 'from-blue-500/10 to-navy/5',
    dot: 'bg-blue-500',
    service: 'aide_devoirs',
  },
  {
    icon: '🎯',
    title: 'Soutien scolaire',
    desc: 'Cours particuliers adaptés au niveau et au rythme de chaque élève.',
    accent: 'from-violet-500/10 to-violet-500/5',
    dot: 'bg-violet-500',
    service: 'soutien_scolaire',
  },
  {
    icon: '📝',
    title: 'Préparation Brevet',
    desc: 'Programme intensif ciblé pour maximiser les résultats au Brevet.',
    accent: 'from-emerald-500/10 to-emerald-500/5',
    dot: 'bg-emerald-500',
    service: 'preparation_brevet',
  },
  {
    icon: '🏆',
    title: 'Préparation Bac',
    desc: 'Coaching par matière pour aborder le Baccalauréat sereinement.',
    accent: 'from-gold-500/15 to-gold-500/5',
    dot: 'bg-gold-500',
    service: 'preparation_bac',
  },
  {
    icon: '🧠',
    title: 'Coaching méthodologique',
    desc: "Techniques de travail durables : organisation, mémorisation, concentration.",
    accent: 'from-pink-500/10 to-pink-500/5',
    dot: 'bg-pink-500',
    service: 'coaching_methodologique',
  },
  {
    icon: '🌅',
    title: 'Stages vacances',
    desc: 'Remise à niveau ou avance sur programme pendant toutes les vacances.',
    accent: 'from-orange-500/10 to-orange-500/5',
    dot: 'bg-orange-500',
    service: 'stages_vacances',
  },
  {
    icon: '🌍',
    title: 'Accompagnement bilingue',
    desc: 'Soutien en anglais, espagnol, arabe — tous niveaux.',
    accent: 'from-cyan-500/10 to-cyan-500/5',
    dot: 'bg-cyan-500',
    service: 'accompagnement_bilingue',
  },
]

// Offres pour les structures : plus detaillees que les services "particuliers",
// car un decideur (mairie, CSE, centre de formation) doit comprendre ce qui
// est concretement fourni avant de nous contacter.
const STRUCTURE_OFFERS = [
  {
    icon: '🏛️',
    title: 'Offre Mairie',
    desc: "Votre commune finance le soutien scolaire des enfants de ses quartiers prioritaires (QPV, REP). Nous fournissons des enseignants vérifiés et gérons tout le dispositif.",
    points: [
      "Inscription des familles bénéficiaires et attribution d'un enseignant",
      'Pass Éducatif (QR code) : chaque séance est pointée et tracée',
      'Bilans réguliers de présence et de progression pour vos services',
    ],
    accent: 'from-navy/8 to-navy/4',
    dot: 'bg-navy',
    profile: 'mairie',
  },
  {
    icon: '🏢',
    title: 'Offre CSE / Entreprises',
    desc: "Votre entreprise ou votre CSE offre à ses salariés une aide à la scolarité de leurs enfants, prise en charge en totalité ou en partie.",
    points: [
      "Une formule sur mesure : volume d'heures, matières, durée",
      'Vos salariés demandent leur enseignant depuis leur espace famille',
      "Un espace de suivi et un bilan annuel d'impact RSE",
    ],
    accent: 'from-slate-500/10 to-slate-500/5',
    dot: 'bg-slate-500',
    profile: 'entreprise',
  },
  {
    icon: '🎓',
    title: 'Offre Centre de Formation / École Pro',
    desc: "Vos apprenants sont remis à niveau et préparés à leurs examens par nos enseignants, en petits groupes ou en individuel.",
    points: [
      'Modules de remise à niveau ciblés par cohorte',
      'Suivi individualisé de chaque apprenant',
      'Reporting pédagogique régulier',
    ],
    accent: 'from-indigo-500/10 to-indigo-500/5',
    dot: 'bg-indigo-500',
    profile: 'centre_formation_ecole_pro',
  },
]

function ContactCta() {
  return (
    <a
      href="#contact"
      className="group flex flex-col justify-between rounded-2xl border border-dashed border-navy/25 bg-navy/[0.03] p-6 transition-all hover:border-gold-400/50 hover:bg-navy/[0.05] sm:col-span-2"
    >
      <div>
        <h3 className="font-sans font-bold text-navy text-sm mb-2">
          Un besoin qui ne figure pas ici ?
        </h3>
        <p className="font-sans text-gray-500 text-sm leading-relaxed">
          Parlons de votre situation : nous adaptons l'accompagnement à chaque élève.
        </p>
      </div>
      <span className="mt-4 inline-flex items-center gap-1.5 font-sans text-sm font-bold text-navy group-hover:text-gold-600 transition-colors">
        Nous contacter →
      </span>
    </a>
  )
}

function handleServiceClick(service, profile) {
  window.dispatchEvent(new CustomEvent('nafoore-select-service', { detail: { service, profile } }))
  document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })
}

export default function Services() {
  return (
    <section id="services" className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        {/* En-tête */}
        <div className="max-w-2xl mb-16">
          <div className="inline-flex items-center gap-2 bg-gold-400/15 text-gold-600 font-sans text-xs font-bold uppercase tracking-widest px-3.5 py-1.5 rounded-full mb-5">
            <span className="w-1 h-1 bg-gold-500 rounded-full" />
            Nos services
          </div>
          <h2 className="font-serif text-3xl lg:text-4xl font-bold text-navy mb-4 leading-tight">
            Un accompagnement pour{' '}
            <span className="text-gold-500">chaque besoin</span>
          </h2>
          <p className="font-sans text-gray-500 text-lg leading-relaxed">
            Du soutien ponctuel à l'accompagnement annuel — des formules pensées
            pour chaque élève et chaque structure.
          </p>
        </div>

        {/* Grille */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SERVICES.map(({ icon, title, desc, accent, dot, service, profile }, i) => (
            <button
              key={title}
              type="button"
              onClick={() => handleServiceClick(service, profile)}
              className={`relative group w-full text-left bg-gradient-to-br ${accent} border border-gray-100 rounded-2xl p-6 hover:border-gold-400/40 hover:shadow-lg hover:shadow-navy/5 hover:-translate-y-1 transition-all duration-200 cursor-pointer`}
            >
              {/* Numéro discret */}
              <span className="absolute top-4 right-5 font-serif text-4xl font-bold text-gray-100 select-none leading-none">
                {String(i + 1).padStart(2, '0')}
              </span>

              {/* Icône */}
              <div className="relative w-11 h-11 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center text-xl mb-4">
                {icon}
                <span className={`absolute -top-1 -right-1 w-3 h-3 ${dot} rounded-full border-2 border-white`} />
              </div>

              <h3 className="font-sans font-bold text-navy text-sm mb-2 group-hover:text-gold-600 transition-colors">
                {title}
              </h3>
              <p className="font-sans text-gray-500 text-sm leading-relaxed">{desc}</p>
            </button>
          ))}
          <ContactCta />
        </div>

        {/* Offres pour les structures */}
        <div className="mt-20">
          <h3 className="font-serif text-2xl lg:text-3xl font-bold text-navy mb-2">
            Pour les <span className="text-gold-500">structures</span>
          </h3>
          <p className="font-sans text-gray-500 mb-8 max-w-2xl">
            Mairies, entreprises, centres de formation : nous mettons en place et suivons le
            dispositif pour vous.
          </p>
          <div className="grid gap-5 lg:grid-cols-3">
            {STRUCTURE_OFFERS.map(({ icon, title, desc, points, accent, dot, profile }) => (
              <button
                key={title}
                type="button"
                onClick={() => handleServiceClick(undefined, profile)}
                className={`group flex flex-col w-full text-left bg-gradient-to-br ${accent} border border-gray-100 rounded-2xl p-7 hover:border-gold-400/40 hover:shadow-lg hover:shadow-navy/5 hover:-translate-y-1 transition-all duration-200 cursor-pointer`}
              >
                <div className="relative w-12 h-12 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center text-2xl mb-5">
                  {icon}
                  <span className={`absolute -top-1 -right-1 w-3 h-3 ${dot} rounded-full border-2 border-white`} />
                </div>
                <h4 className="font-sans font-bold text-navy text-base mb-2 group-hover:text-gold-600 transition-colors">
                  {title}
                </h4>
                <p className="font-sans text-gray-600 text-sm leading-relaxed mb-5">{desc}</p>
                <ul className="space-y-2 mb-6 flex-1">
                  {points.map((point) => (
                    <li key={point} className="flex items-start gap-2 font-sans text-sm text-gray-600">
                      <span className="mt-0.5 text-xs text-gold-500">✓</span>
                      {point}
                    </li>
                  ))}
                </ul>
                <span className="font-sans text-sm font-bold text-navy group-hover:text-gold-600 transition-colors">
                  Nous contacter →
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
