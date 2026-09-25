// Couleur d'une matiere, identique partout sur la fiche de l'enfant (cartes
// de progression, seances) : attribuee dans l'ordre alphabetique des
// matieres de l'enfant, pour rester stable d'une visite a l'autre.
const PALETTE = [
  { bar: 'bg-navy', dot: 'bg-navy', soft: 'bg-navy/5', text: 'text-navy' },
  { bar: 'bg-gold-500', dot: 'bg-gold-500', soft: 'bg-amber-50', text: 'text-amber-700' },
  { bar: 'bg-emerald-500', dot: 'bg-emerald-500', soft: 'bg-emerald-50', text: 'text-emerald-700' },
  { bar: 'bg-violet-500', dot: 'bg-violet-500', soft: 'bg-violet-50', text: 'text-violet-700' },
  { bar: 'bg-rose-500', dot: 'bg-rose-500', soft: 'bg-rose-50', text: 'text-rose-700' },
  { bar: 'bg-sky-500', dot: 'bg-sky-500', soft: 'bg-sky-50', text: 'text-sky-700' },
  { bar: 'bg-orange-500', dot: 'bg-orange-500', soft: 'bg-orange-50', text: 'text-orange-700' },
  { bar: 'bg-teal-500', dot: 'bg-teal-500', soft: 'bg-teal-50', text: 'text-teal-700' },
]

export function subjectPalette(subjects) {
  const sorted = [...new Set(subjects.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr'))
  const map = new Map(sorted.map((subject, i) => [subject, PALETTE[i % PALETTE.length]]))
  return (subject) => map.get(subject) ?? PALETTE[0]
}
