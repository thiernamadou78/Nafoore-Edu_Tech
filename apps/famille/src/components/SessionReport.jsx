// Compte-rendu structure d'une seance (= le bilan) : meme presentation dans
// les trois portails.
export function Stars({ value }) {
  if (!value) return <span className="text-gray-400">—</span>
  return (
    <span className="whitespace-nowrap text-amber-500" aria-label={`${value} sur 5`}>
      {'★'.repeat(value)}
      <span className="text-gray-300">{'★'.repeat(5 - value)}</span>
    </span>
  )
}

export function hasStructuredReport(session) {
  return Boolean(session.chapter || session.topics || session.understanding || session.participation)
}

export function SessionReport({ session }) {
  if (!hasStructuredReport(session)) {
    return session.notes ? (
      <p className="whitespace-pre-wrap break-words text-xs text-gray-600">{session.notes}</p>
    ) : null
  }

  const rows = [
    ['Matière', session.subject],
    ['Chapitre', session.chapter],
    ['Notions abordées', session.topics],
    ['Compréhension', session.understanding ? <Stars value={session.understanding} /> : null],
    ['Participation', session.participation ? <Stars value={session.participation} /> : null],
    ['Difficultés constatées', session.difficulties],
    ['Travail recommandé', session.homework],
  ].filter(([, value]) => value)

  return (
    <dl className="space-y-1 text-xs">
      {rows.map(([label, value]) => (
        <div key={label} className="flex flex-wrap gap-x-1.5">
          <dt className="font-medium text-gray-500">{label} :</dt>
          <dd className="whitespace-pre-wrap break-words text-gray-800">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

// Saisie des etoiles (1 a 5) cote enseignant.
export function StarInput({ value, onChange, label }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-28 shrink-0 text-sm text-gray-700">{label}</span>
      <div className="flex gap-0.5" role="radiogroup" aria-label={label}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} sur 5`}
            onClick={() => onChange(n)}
            className={`text-2xl leading-none transition-colors ${
              n <= (value ?? 0) ? 'text-amber-500' : 'text-gray-300 hover:text-amber-300'
            }`}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  )
}
