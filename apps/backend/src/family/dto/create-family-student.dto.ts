import {
  IsArray,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { IsPlausibleBirthDate } from '../../common/is-plausible-birthdate.validator';

export class CreateFamilyStudentDto {
  @IsString()
  @MinLength(2, { message: 'Le nom doit faire au moins 2 caractères' })
  @MaxLength(100)
  name: string;

  @IsIn(['homme', 'femme'], { message: 'genre doit être homme ou femme' })
  gender: string;

  @IsIn(['primaire', 'college', 'lycee'], { message: 'level doit être primaire, college ou lycee' })
  level: string;

  @IsIn(
    ['cp', 'ce1', 'ce2', 'cm1', 'cm2', '6e', '5e', '4e', '3e', '2nde', '1re', 'terminale'],
    { message: 'La classe est obligatoire' },
  )
  classe: string;

  @IsString()
  @IsNotEmpty({ message: "L'école est obligatoire" })
  @MaxLength(200)
  school: string;

  // Par defaut la meme que celle de la famille (prefill cote client), mais
  // reste modifiable (ex: enfant chez l'autre parent) — obligatoire dans
  // tous les cas pour la precision du geocodage.
  @IsString()
  @MinLength(1, { message: "L'adresse est obligatoire" })
  @MaxLength(300)
  address: string;

  // Ameliore la precision du geocodage (voir GeocodingService.geocode).
  @IsString()
  @Matches(/^\d{5}$/, { message: 'Le code postal doit contenir 5 chiffres' })
  postalCode: string;

  @Length(2, 100, { message: 'La ville / commune est obligatoire' })
  city: string;

  @IsOptional()
  @IsDateString()
  @IsPlausibleBirthDate()
  dateNaissance?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  subjects?: string[];
}
