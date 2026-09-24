import { Transform } from 'class-transformer';
import { ArrayMinSize, IsArray, IsEmail, IsIn, IsNotEmpty, IsString, Length, Matches, MaxLength, MinLength } from 'class-validator';
import { IsKnownSubject } from '../../common/subjects';
import { PHONE_ERROR_MESSAGE, PHONE_REGEX } from '../../common/phone';

// Accepte un tableau, un tableau JSON ('["a","b"]' — le formulaire envoie
// ce format car un nom de matiere peut contenir une virgule) ou, pour
// compatibilite, une liste separee par des virgules.
function toArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string' && value.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      // format invalide : on retombe sur le decoupage par virgules
    }
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

export class CreatePublicTeacherApplicationDto {
  @IsIn(['homme', 'femme'], { message: 'Le genre est obligatoire (homme ou femme)' })
  gender: 'homme' | 'femme';

  @IsString()
  @MinLength(2, { message: 'Le nom doit faire au moins 2 caractères' })
  @MaxLength(100)
  candidateName: string;

  @IsEmail({}, { message: 'Email invalide' })
  candidateEmail: string;

  @IsString()
  @Matches(PHONE_REGEX, { message: PHONE_ERROR_MESSAGE })
  phone: string;

  @Transform(({ value }) => toArray(value))
  @IsArray({ message: 'Au moins une matière est requise' })
  @ArrayMinSize(1, { message: 'Au moins une matière est requise' })
  @IsKnownSubject({ each: true })
  subjects: string[];

  // Niveaux et classes (soutien scolaire). Facultatifs pour un formateur qui
  // ne propose que des domaines professionnels : le service exige un niveau
  // des qu'une matiere scolaire est choisie, et une classe par niveau coche.
  @Transform(({ value }) => toArray(value))
  @IsArray()
  @IsString({ each: true })
  levels: string[] = [];

  @Transform(({ value }) => toArray(value))
  @IsArray()
  @IsString({ each: true })
  classes: string[] = [];

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  zone: string;

  @IsString()
  @Matches(/^\d{5}$/, { message: 'Le code postal doit contenir 5 chiffres' })
  postalCode: string;

  @Length(2, 100, { message: 'La ville / commune est obligatoire' })
  city: string;

  @Length(20, 2000, {
    message: 'La présentation (bio) est obligatoire : entre 20 et 2000 caractères',
  })
  bio: string;

  @IsString({ message: 'Indiquez au moins un jour de disponibilité' })
  @IsNotEmpty({ message: 'Indiquez au moins un jour de disponibilité' })
  @MaxLength(1000)
  availability: string;
}
