import { registerDecorator, ValidationOptions } from 'class-validator';

// Un eleve ne peut raisonnablement pas avoir moins de 5 ans (avant CP) ni
// plus de 20 ans (au-dela de la Terminale, marge pour redoublement) — sans
// ce controle, une date de naissance comme 2025 ou 2026 (l'annee en cours)
// passait la simple verification @IsDateString() sans etre detectee.
const MIN_AGE = 5;
const MAX_AGE = 20;

function computeAge(birthDate: Date, now: Date): number {
  let age = now.getFullYear() - birthDate.getFullYear();
  const hasHadBirthdayThisYear =
    now.getMonth() > birthDate.getMonth() ||
    (now.getMonth() === birthDate.getMonth() && now.getDate() >= birthDate.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}

export function IsPlausibleBirthDate(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isPlausibleBirthDate',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'string') return false;
          const date = new Date(value);
          if (Number.isNaN(date.getTime())) return false;
          const age = computeAge(date, new Date());
          return age >= MIN_AGE && age <= MAX_AGE;
        },
        defaultMessage() {
          return `La date de naissance doit correspondre à un âge entre ${MIN_AGE} et ${MAX_AGE} ans`;
        },
      },
    });
  };
}
