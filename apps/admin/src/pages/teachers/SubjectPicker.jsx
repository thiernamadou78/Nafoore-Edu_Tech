import { SUBJECT_CATEGORY_LABELS, useSubjects } from '../../lib/useSubjects'

// Matieres du catalogue, groupees (soutien scolaire / formation pro). Une
// matiere deja choisie mais masquee depuis reste affichee pour pouvoir la
// retirer.
export function SubjectPicker({ selected, onChange }) {
  const catalog = useSubjects()
  const toggle = (subject) => {
    onChange(
      selected.includes(subject) ? selected.filter((s) => s !== subject) : [...selected, subject],
    )
  }

  const hidden = selected.filter((name) => !catalog.some((s) => s.name === name))
  const groups = ['scolaire', 'professionnel']
    .map((category) => ({
      category,
      names: catalog.filter((s) => s.category === category).map((s) => s.name),
    }))
    .filter((group) => group.names.length > 0)
  if (hidden.length > 0 && catalog.length > 0) groups.push({ category: 'hidden', names: hidden })

  const chip = (subject) => (
    <button
      key={subject}
      type="button"
      onClick={() => toggle(subject)}
      className={`rounded-lg border-2 px-2.5 py-1 text-xs font-medium transition-colors ${
        selected.includes(subject)
          ? 'border-navy bg-navy text-white'
          : 'border-gray-200 bg-white text-gray-600 hover:border-navy/30'
      }`}
    >
      {subject}
    </button>
  )

  return (
    <div className="space-y-2">
      {groups.map((group) => (
        <div key={group.category}>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            {SUBJECT_CATEGORY_LABELS[group.category] ?? 'Matières masquées'}
          </p>
          <div className="flex flex-wrap gap-1.5">{group.names.map(chip)}</div>
        </div>
      ))}
    </div>
  )
}
