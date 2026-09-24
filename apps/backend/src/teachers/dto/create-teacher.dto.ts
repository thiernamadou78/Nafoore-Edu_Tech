import { DAYS_OF_WEEK } from '../../common/days';
import { ArrayMinSize, IsArray, IsEmail, IsIn, IsOptional, IsString, Length, Matches, MaxLength, MinLength } from 'class-validator';
import { IsKnownSubject } from '../../common/subjects';
import { CLASSE_OPTIONS, LEVEL_OPTIONS } from '../../common/levels';
import { PHONE_ERROR_MESSAGE, PHONE_REGEX } from '../../common/phone';

// Un enseignant créé directement par l'admin doit avoir un dossier aussi
// complet qu'un candidat auto-inscrit via la vitrine (cf.
// CreatePublicTeacherApplicationDto) : mêmes champs obligatoires.
export class CreateTeacherDto {
  @IsString()
  @MinLength(2, { message: 'Le nom doit faire au moins 2 caractères' })
  @MaxLength(100)
  name: string;

  @IsIn(['homme', 'femme'], { message: 'Le genre est obligatoire (homme ou femme)' })
  gender: 'homme' | 'femme';

  @IsArray()
  @ArrayMinSize(1, { message: 'Au moins une matière est requise' })
  @IsKnownSubject({ each: true })
  subjects: string[];

  // Niveaux et classes enseignes (voir common/levels.ts).
  @IsOptional()
  @IsArray()
  @IsIn(LEVEL_OPTIONS, { each: true, message: 'Niveau inconnu' })
  levels?: string[];

  @IsOptional()
  @IsArray()
  @IsIn(CLASSE_OPTIONS, { each: true, message: 'Classe inconnue' })
  classes?: string[];

  @Length(20, 2000, {
    message: 'La présentation (bio) est obligatoire : entre 20 et 2000 caractères',
  })
  bio: string;

  @IsString()
  @MinLength(2, { message: "L'adresse est obligatoire" })
  @MaxLength(100)
  address: string;

  // Ameliore la precision du geocodage (voir GeocodingService.geocode).
  @IsString()
  @Matches(/^\d{5}$/, { message: 'Le code postal doit contenir 5 chiffres' })
  postalCode: string;

  @Length(2, 100, { message: 'La ville / commune est obligatoire' })
  city: string;

  @IsOptional()
  @IsArray()
  @IsIn(DAYS_OF_WEEK, { each: true, message: 'Jour de disponibilité invalide' })
  availabilityDays?: string[];

  @IsEmail({}, { message: 'Email invalide' })
  email: string;

  @IsString()
  @Matches(PHONE_REGEX, { message: PHONE_ERROR_MESSAGE })
  phone: string;
}
