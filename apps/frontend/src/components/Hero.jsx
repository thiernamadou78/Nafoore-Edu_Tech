const STATS = [
  { value: '500+', label: 'Élèves accompagnés' },
  { value: '98%', label: 'Satisfaction' },
  { value: '50+', label: 'Enseignants' },
]

const SUBJECTS = [
  { name: 'Mathématiques', before: 9, after: 14, color: '#1E3A8A', pct: 70 },
  { name: 'Français',       before: 11, after: 15, color: '#EAB308', pct: 75 },
  { name: 'Anglais',        before: 8,  after: 13, color: '#8B5CF6', pct: 65 },
  { name: 'Histoire-Géo',   before: 10, after: 14, color: '#10B981', pct: 70 },
]

function CircleProgress({ percent = 78, size = 96, stroke = 9 }) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (percent / 100) * circ
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke="url(#gold-grad)"
          strokeWidth={stroke}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
        <defs>
          <linearGradient id="gold-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FACC15" />
            <stop offset="100%" stopColor="#EAB308" />
          </linearGradient>
        </defs>
      </svg>
      {/* Label centré */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-serif text-xl font-bold text-white leading-none">{percent}%</span>
        <span className="font-sans text-white/50 text-[10px] mt-0.5">global</span>
      </div>
    </div>
  )
}

function MockDashboard() {
  return (
    <div className="relative">
      {/* Cercles décoratifs */}
      <div className="absolute -top-10 -right-10 w-52 h-52 rounded-full border border-gold-400/15 pointer-events-none" />
      <div className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full border border-gold-400/10 pointer-events-none" />

      {/* Card principale */}
      <div className="relative bg-white rounded-3xl shadow-2xl shadow-navy/25 overflow-hidden border border-gray-100/60">

        {/* ── Header ── */}
        <div className="bg-navy px-5 pt-5 pb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gold-500 flex items-center justify-center font-serif font-bold text-navy text-sm shadow-md">
                LM
              </div>
              <div>
                <p className="font-sans font-bold text-white text-sm leading-tight">Lucas M.</p>
                <p className="font-sans text-white/50 text-xs">3ème · Collège Jean Jaurès</p>
              </div>
            </div>
            <span className="flex items-center gap-1.5 bg-green-500/20 text-green-400 font-sans text-xs font-semibold px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              En progrès
            </span>
          </div>

          {/* Stat row */}
          <div className="flex items-center gap-2">
            {[
              { label: 'Heures', val: '24h' },
              { label: 'Séances', val: '8' },
              { label: 'Ce trimestre', val: '+5 pts', highlight: true },
            ].map(({ label, val, highlight }) => (
              <div
                key={label}
                className={`flex-1 text-center py-2 rounded-xl ${highlight ? 'bg-gold-500/20 border border-gold-500/30' : 'bg-white/8'}`}
              >
                <p className={`font-sans font-bold text-sm ${highlight ? 'text-gold-400' : 'text-white'}`}>{val}</p>
                <p className="font-sans text-white/40 text-[10px] mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Performance du trimestre ── */}
        <div className="bg-navy/95 px-5 py-4 flex items-center gap-5 border-t border-white/8">
          <CircleProgress percent={78} size={88} stroke={8} />
          <div className="flex-1">
            <p className="font-sans text-white/50 text-xs uppercase tracking-wider mb-2">Performance trimestre</p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Assiduité', val: '100%', color: 'text-green-400' },
                { label: 'Devoirs', val: '92%', color: 'text-gold-400' },
                { label: 'Progrès moy.', val: '+4.5 pts', color: 'text-blue-400' },
              ].map(({ label, val, color }) => (
                <div key={label} className="bg-white/8 rounded-lg px-2.5 py-1.5">
                  <p className={`font-sans font-bold text-xs ${color}`}>{val}</p>
                  <p className="font-sans text-white/40 text-[10px]">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Matières ── */}
        <div className="bg-white px-5 py-4">
          <p className="font-sans text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
            Progression par matière
          </p>
          <div className="space-y-3">
            {SUBJECTS.map(({ name, before, after, color, pct }) => (
              <div key={name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-sans text-xs font-semibold text-gray-600">{name}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-sans text-[10px] text-gray-300 line-through">{before}</span>
                    <span className="font-sans text-xs font-bold text-gray-700">{after}/20</span>
                    <span className="font-sans text-[10px] font-bold text-green-500">↑{after - before}</span>
                  </div>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}88, ${color})` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Prochaine séance ── */}
        <div className="bg-gray-50 border-t border-gray-100 px-5 py-3.5 flex items-center gap-3">
          <div className="w-9 h-9 bg-navy rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
            <svg className="w-4 h-4 text-gold-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-sans text-xs font-bold text-navy">Prochaine séance</p>
            <p className="font-sans text-xs text-gray-400 truncate">Jeudi 17h00 — Mathématiques (visio)</p>
          </div>
          <span className="flex-shrink-0 bg-navy/8 text-navy font-sans text-[10px] font-bold px-2 py-1 rounded-lg">
            Dans 2j
          </span>
        </div>
      </div>

      {/* Badge notification flottant */}
      <div className="absolute -top-3 -right-3 bg-green-500 text-white rounded-2xl px-3.5 py-2 shadow-lg shadow-green-500/30 flex items-center gap-1.5">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        <span className="font-sans text-xs font-bold">Objectif atteint</span>
      </div>
    </div>
  )
}

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-cream py-20 lg:py-28">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 70% -10%, rgba(250,204,21,0.12) 0%, transparent 60%)',
        }}
      />

      <div className="max-w-6xl mx-auto px-4 relative">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Colonne gauche */}
          <div>
            <div className="inline-flex items-center gap-2 bg-navy/8 border border-navy/10 text-navy font-sans text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full mb-7">
              <span className="w-1.5 h-1.5 bg-gold-500 rounded-full" />
              Plateforme EdTech innovante
            </div>

            <h1 className="font-serif text-4xl lg:text-5xl xl:text-6xl font-bold text-navy leading-[1.1] mb-6">
              Éclairer chaque élève{' '}
              <span className="relative inline-block">
                <span className="relative z-10 text-gold-500">vers la réussite</span>
                <span
                  className="absolute bottom-1 left-0 w-full h-3 bg-gold-400/20 -z-0 rounded"
                  aria-hidden="true"
                />
              </span>
            </h1>

            <p className="font-sans text-gray-500 text-lg leading-relaxed mb-10 max-w-md">
              Soutien scolaire personnalisé par des enseignants vérifiés — pour
              les familles, les mairies et les entreprises.
            </p>

            <div className="flex flex-wrap gap-3 mb-12">
              <a
                href="#contact"
                className="inline-flex items-center gap-2 bg-navy text-white font-sans font-semibold px-7 py-3.5 rounded-full hover:bg-navy/90 transition-all shadow-lg shadow-navy/25 hover:shadow-xl hover:shadow-navy/30 hover:-translate-y-0.5"
              >
                Inscrire un élève
                <span className="text-gold-400">→</span>
              </a>
              <a
                href="#services"
                className="inline-flex items-center gap-2 text-navy font-sans font-semibold px-7 py-3.5 rounded-full border-2 border-navy/20 hover:border-navy/40 hover:bg-navy/4 transition-all"
              >
                Nos services
              </a>
            </div>

            <div className="flex items-center gap-0 divide-x divide-gray-200">
              {STATS.map(({ value, label }) => (
                <div key={label} className="px-6 first:pl-0 last:pr-0">
                  <div className="font-sans text-3xl font-black text-navy tracking-tight">{value}</div>
                  <div className="font-sans text-xs text-gray-400 mt-1">{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Colonne droite */}
          <div className="hidden lg:flex justify-end">
            <div className="w-full max-w-[360px]">
              <MockDashboard />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
