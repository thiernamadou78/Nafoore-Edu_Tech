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

// PATCH generique (partiel) : @IsOptional() partout pour permettre de ne
// modifier qu'un champ, mais quand un champ est envoye, il doit respecter
// les memes exigences qu'a la creation (jamais de valeur vide/blanche).
export class UpdateTeacherDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Le nom doit faire au moins 2 caractères' })
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'Au moins une matière est requise' })
  @IsIn(SUBJECT_OPTIONS, { each: true, message: 'Matière inconnue' })
  subjects?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;

  // Repere geographique general du prof (ex-"zone") — le prof se deplace
  // pour un cours en presentiel, pas la famille.
  @IsOptional()
  @IsString()
  @MinLength(2, { message: "L'adresse est obligatoire" })
  @MaxLength(200)
  address?: string;

  // Ameliore la precision du geocodage (voir GeocodingService.geocode).
  @IsOptional()
  @IsString()
  @Matches(/^\d{5}$/, { message: 'Le code postal doit contenir 5 chiffres' })
  postalCode?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email invalide' })
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Le téléphone est obligatoire' })
  @MaxLength(20)
  phone?: string;
}
