// Niveaux et classes scolaires (memes valeurs que l'API : common/levels.ts).
export const LEVELS = [
  { value: 'primaire', label: 'Primaire', classes: ['cp', 'ce1', 'ce2', 'cm1', 'cm2'] },
  { value: 'college', label: 'Collège', classes: ['6e', '5e', '4e', '3e'] },
  { value: 'lycee', label: 'Lycée', classes: ['2nde', '1re', 'terminale'] },
]

export const CLASS_LABELS = {
  cp: 'CP',
  ce1: 'CE1',
  ce2: 'CE2',
  cm1: 'CM1',
  cm2: 'CM2',
  '6e': '6e',
  '5e': '5e',
  '4e': '4e',
  '3e': '3e',
  '2nde': '2nde',
  '1re': '1re',
  terminale: 'Terminale',
}

// Texte court : "Collège (6e, 5e) · Lycée" — niveau sans classe precise =
// tout le niveau.
export function formatLevels(levels = [], classes = []) {
  return LEVELS.filter((level) => levels.includes(level.value))
    .map((level) => {
      const picked = level.classes.filter((c) => classes.includes(c))
      return picked.length > 0 && picked.length < level.classes.length
        ? `${level.label} (${picked.map((c) => CLASS_LABELS[c]).join(', ')})`
        : level.label
    })
    .join(' · ')
}

// Meme regle que l'API (matchLevel) : 'match' | 'unknown' | 'no'.
export function matchLevel(teacher, student) {
  const levels = teacher.levels ?? []
  const classes = teacher.classes ?? []
  if (levels.length === 0 && classes.length === 0) return 'unknown'
  const level =
    student.level ?? LEVELS.find((l) => l.classes.includes(student.classe))?.value
  if (!level || !levels.includes(level)) return 'no'
  const classesForLevel = LEVELS.find((l) => l.value === level).classes.filter((c) =>
    classes.includes(c),
  )
  if (classesForLevel.length === 0 || !student.classe) return 'match'
  return classesForLevel.includes(student.classe) ? 'match' : 'no'
}
