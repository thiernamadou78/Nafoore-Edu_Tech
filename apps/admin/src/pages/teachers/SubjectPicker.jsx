import { SUBJECT_OPTIONS } from './subjects'

export function SubjectPicker({ selected, onChange }) {
  const toggle = (subject) => {
    onChange(
      selected.includes(subject) ? selected.filter((s) => s !== subject) : [...selected, subject],
    )
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {SUBJECT_OPTIONS.map((subject) => (
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
      ))}
    </div>
  )
}
