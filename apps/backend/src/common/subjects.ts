import { ValidationOptions, registerDecorator } from 'class-validator';

// Catalogue des matieres connues (table `subjects`, gere par le Super Admin).
// Utilise pour valider Teacher.subjects, TeacherApplication.subjects,
// TeacherRequest.subject… afin qu'ils partagent le meme vocabulaire — sans
// ca, faire correspondre une demande famille aux matieres d'un prof serait
// impossible (comparaison de texte libre non fiable).
//
// Garde en memoire (la validation class-validator est synchrone) et tenu a
// jour par SubjectsService : au demarrage, a chaque modification, puis
// toutes les minutes. Les matieres masquees restent valides (donnees
// existantes) ; seules les listes de choix les cachent.
const catalog = new Set<string>();

export function setSubjectCatalog(names: string[]) {
  catalog.clear();
  for (const name of names) catalog.add(name);
}

export function isKnownSubject(value: unknown): boolean {
  return typeof value === 'string' && catalog.has(value);
}

// @IsKnownSubject() / @IsKnownSubject({ each: true }) : remplace
// @IsIn(SUBJECT_OPTIONS) depuis que la liste est dynamique.
export function IsKnownSubject(options?: ValidationOptions) {
  return (object: object, propertyName: string) =>
    registerDecorator({
      name: 'isKnownSubject',
      target: object.constructor,
      propertyName,
      options: { message: 'Matière inconnue', ...options },
      validator: { validate: (value: unknown) => isKnownSubject(value) },
    });
}
