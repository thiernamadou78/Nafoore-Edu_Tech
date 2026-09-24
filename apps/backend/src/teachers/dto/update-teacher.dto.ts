import { DAYS_OF_WEEK } from '../../common/days';
import { ArrayMinSize, IsArray, IsEmail, IsIn, IsOptional, IsString, Length, Matches, MaxLength, MinLength } from 'class-validator';
import { IsKnownSubject } from '../../common/subjects';
import { PHONE_ERROR_MESSAGE, PHONE_REGEX } from '../../common/phone';

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
  @IsIn(['homme', 'femme'], { message: 'Le genre doit être homme ou femme' })
  gender?: 'homme' | 'femme';

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'Au moins une matière est requise' })
  @IsKnownSubject({ each: true })
  subjects?: string[];

  @IsOptional()
  @Length(20, 2000, {
    message: 'La présentation (bio) est obligatoire : entre 20 et 2000 caractères',
  })
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
  @Length(2, 100, { message: 'La ville / commune doit faire entre 2 et 100 caractères' })
  city?: string;

  @IsOptional()
  @IsArray()
  @IsIn(DAYS_OF_WEEK, { each: true, message: 'Jour de disponibilité invalide' })
  availabilityDays?: string[];

  @IsOptional()
  @IsEmail({}, { message: 'Email invalide' })
  email?: string;

  @IsOptional()
  @IsString()
  @Matches(PHONE_REGEX, { message: PHONE_ERROR_MESSAGE })
  phone?: string;
}
