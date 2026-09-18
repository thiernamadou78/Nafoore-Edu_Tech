import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { SUBJECT_OPTIONS } from '../../common/subjects';
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
  @IsIn(SUBJECT_OPTIONS, { each: true, message: 'Matière inconnue' })
  subjects: string[];

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

  @IsEmail({}, { message: 'Email invalide' })
  email: string;

  @IsString()
  @Matches(PHONE_REGEX, { message: PHONE_ERROR_MESSAGE })
  phone: string;
}
