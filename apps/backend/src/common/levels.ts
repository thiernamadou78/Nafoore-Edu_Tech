// Niveaux et classes scolaires (memes valeurs que Student.level/classe et
// que le formulaire de candidature).
export const CLASSES_BY_LEVEL: Record<string, string[]> = {
  primaire: ['cp', 'ce1', 'ce2', 'cm1', 'cm2'],
  college: ['6e', '5e', '4e', '3e'],
  lycee: ['2nde', '1re', 'terminale'],
};
export const LEVEL_OPTIONS = Object.keys(CLASSES_BY_LEVEL);
export const CLASSE_OPTIONS = Object.values(CLASSES_BY_LEVEL).flat();

// Ne garde que les classes des niveaux coches (decocher "college" retire
// aussi 6e…3e), dans l'ordre du programme.
export function normalizeLevels(levels: string[], classes: string[]) {
  const cleanLevels = LEVEL_OPTIONS.filter((level) => levels.includes(level));
  const cleanClasses = cleanLevels.flatMap((level) =>
    CLASSES_BY_LEVEL[level].filter((classe) => classes.includes(classe)),
  );
  return { levels: cleanLevels, classes: cleanClasses };
}

export type LevelMatch = 'match' | 'unknown' | 'no';

// Un enseignant convient-il a un eleve (niveau / classe) ?
// - classes precisees pour ce niveau : la classe de l'eleve doit y etre
//   (Maths 5e ne concerne pas un prof qui n'enseigne qu'en 6e) ;
// - niveau coche sans classe precise (anciens profils) : le niveau suffit ;
// - aucun niveau renseigne : "unknown" (a completer par l'admin).
export function matchLevel(
  teacher: { levels: string[]; classes: string[] },
  student: { level: string | null; classe: string | null },
): LevelMatch {
  if (teacher.levels.length === 0 && teacher.classes.length === 0) return 'unknown';
  const level = student.level ?? LEVEL_OPTIONS.find((l) => CLASSES_BY_LEVEL[l].includes(student.classe ?? ''));
  if (!level || !teacher.levels.includes(level)) return 'no';
  const classesForLevel = CLASSES_BY_LEVEL[level].filter((c) => teacher.classes.includes(c));
  if (classesForLevel.length === 0 || !student.classe) return 'match';
  return classesForLevel.includes(student.classe) ? 'match' : 'no';
}
