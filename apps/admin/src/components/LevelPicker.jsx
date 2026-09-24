import { CLASS_LABELS, LEVELS } from '../lib/levels'

// Niveaux puis classes precises de chaque niveau coche. Un niveau sans
// classe cochee = tout le niveau.
export function LevelPicker({ levels, classes, onChange }) {
  const toggleLevel = (value) => {
    const removing = levels.includes(value)
    const levelClasses = LEVELS.find((l) => l.value === value).classes
    onChange({
      levels: removing ? levels.filter((l) => l !== value) : [...levels, value],
      classes: removing ? classes.filter((c) => !levelClasses.includes(c)) : classes,
    })
  }
  const toggleClass = (value) =>
    onChange({
      levels,
      classes: classes.includes(value) ? classes.filter((c) => c !== value) : [...classes, value],
    })

  const chip = (active) =>
    `rounded-lg border-2 px-2.5 py-1 text-xs font-medium transition-colors ${
      active ? 'border-navy bg-navy text-white' : 'border-gray-200 bg-white text-gray-600 hover:border-navy/30'
    }`

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {LEVELS.map((level) => (
          <button
            key={level.value}
            type="button"
            onClick={() => toggleLevel(level.value)}
            className={chip(levels.includes(level.value))}
          >
            {level.label}
          </button>
        ))}
      </div>
      {LEVELS.filter((level) => levels.includes(level.value)).map((level) => (
        <div key={level.value} className="flex flex-wrap items-center gap-1.5 rounded-lg bg-gray-50 px-2.5 py-2">
          <span className="mr-1 w-16 text-xs font-semibold text-gray-500">{level.label}</span>
          {level.classes.map((classe) => (
            <button
              key={classe}
              type="button"
              onClick={() => toggleClass(classe)}
              className={chip(classes.includes(classe))}
            >
              {CLASS_LABELS[classe]}
            </button>
          ))}
          {!level.classes.some((c) => classes.includes(c)) && (
            <span className="text-xs text-gray-400">toutes les classes</span>
          )}
        </div>
      ))}
    </div>
  )
}
