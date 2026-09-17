import {
  IsArray,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { IsPlausibleBirthDate } from '../../common/is-plausible-birthdate.validator';

export class UpdateFamilyStudentDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Le nom doit faire au moins 2 caractères' })
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsIn(['homme', 'femme'], { message: 'genre doit être homme ou femme' })
  gender?: string;

  @IsOptional()
  @IsIn(['primaire', 'college', 'lycee'], { message: 'level doit être primaire, college ou lycee' })
  level?: string;

  @IsOptional()
  @IsIn(
    ['cp', 'ce1', 'ce2', 'cm1', 'cm2', '6e', '5e', '4e', '3e', '2nde', '1re', 'terminale'],
    { message: 'Classe invalide' },
  )
  classe?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  school?: string;

  @IsOptional()
  @IsString()
  @MinLength(1, { message: "L'adresse est obligatoire" })
  @MaxLength(300)
  address?: string;

  // Ameliore la precision du geocodage (voir GeocodingService.geocode).
  @IsOptional()
  @IsString()
  @Matches(/^\d{5}$/, { message: 'Le code postal doit contenir 5 chiffres' })
  postalCode?: string;

  @IsOptional()
  @IsDateString()
  @IsPlausibleBirthDate()
  dateNaissance?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  subjects?: string[];
}
