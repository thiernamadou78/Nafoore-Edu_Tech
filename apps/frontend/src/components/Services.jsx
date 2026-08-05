const SERVICES = [
  {
    icon: '📚',
    title: 'Aide aux devoirs',
    desc: 'Accompagnement quotidien du soir, du CP à la Terminale.',
    accent: 'from-blue-500/10 to-navy/5',
    dot: 'bg-blue-500',
  },
  {
    icon: '🎯',
    title: 'Soutien scolaire',
    desc: 'Cours particuliers adaptés au niveau et au rythme de chaque élève.',
    accent: 'from-violet-500/10 to-violet-500/5',
    dot: 'bg-violet-500',
  },
  {
    icon: '📝',
    title: 'Préparation Brevet',
    desc: 'Programme intensif ciblé pour maximiser les résultats au Brevet.',
    accent: 'from-emerald-500/10 to-emerald-500/5',
    dot: 'bg-emerald-500',
  },
  {
    icon: '🏆',
    title: 'Préparation Bac',
    desc: 'Coaching par matière pour aborder le Baccalauréat sereinement.',
    accent: 'from-gold-500/15 to-gold-500/5',
    dot: 'bg-gold-500',
  },
  {
    icon: '🧠',
    title: 'Coaching méthodologique',
    desc: "Techniques de travail durables : organisation, mémorisation, concentration.",
    accent: 'from-pink-500/10 to-pink-500/5',
    dot: 'bg-pink-500',
  },
  {
    icon: '🌅',
    title: 'Stages vacances',
    desc: 'Remise à niveau ou avance sur programme pendant toutes les vacances.',
    accent: 'from-orange-500/10 to-orange-500/5',
    dot: 'bg-orange-500',
  },
  {
    icon: '🌍',
    title: 'Accompagnement bilingue',
    desc: 'Soutien en anglais, espagnol, arabe — tous niveaux.',
    accent: 'from-cyan-500/10 to-cyan-500/5',
    dot: 'bg-cyan-500',
  },
  {
    icon: '🏛️',
    title: 'Offre Mairie',
    desc: 'Dispositifs de réussite éducative pour les quartiers prioritaires (QPV).',
    accent: 'from-navy/8 to-navy/4',
    dot: 'bg-navy',
  },
  {
    icon: '🏢',
    title: 'Offre CSE / Entreprises',
    desc: "Chèques éducatifs et avantages salariés pour les comités d'entreprise.",
    accent: 'from-slate-500/10 to-slate-500/5',
    dot: 'bg-slate-500',
  },
  {
    icon: '🎓',
    title: 'Offre Centre de Formation / École Pro',
    desc: 'Modules de remise à niveau et accompagnement personnalisé pour vos apprenants.',
    accent: 'from-indigo-500/10 to-indigo-500/5',
    dot: 'bg-indigo-500',
  },
]

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
          {SERVICES.map(({ icon, title, desc, accent, dot }, i) => (
            <div
              key={title}
              className={`relative group bg-gradient-to-br ${accent} border border-gray-100 rounded-2xl p-6 hover:border-gold-400/40 hover:shadow-lg hover:shadow-navy/5 hover:-translate-y-1 transition-all duration-200`}
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
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
