import { Transform } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { SUBJECT_OPTIONS } from '../../common/subjects';
import { PHONE_ERROR_MESSAGE, PHONE_REGEX } from '../../common/phone';

function toArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

export class CreatePublicTeacherApplicationDto {
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
  @IsIn(SUBJECT_OPTIONS, { each: true, message: 'Matière inconnue' })
  subjects: string[];

  @Transform(({ value }) => toArray(value))
  @IsArray()
  @ArrayMinSize(1, { message: 'Au moins un niveau est requis' })
  @IsString({ each: true })
  levels: string[];

  // Classes precises enseignees (ex: cm2, 6e, 1re) — obligatoire, et le
  // service verifie qu'il y en a bien au moins une par niveau coche.
  @Transform(({ value }) => toArray(value))
  @IsArray()
  @ArrayMinSize(1, { message: 'Précisez au moins une classe' })
  @IsString({ each: true })
  classes: string[];

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  zone: string;

  @IsString()
  @Matches(/^\d{5}$/, { message: 'Le code postal doit contenir 5 chiffres' })
  postalCode: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  availability?: string;
}
