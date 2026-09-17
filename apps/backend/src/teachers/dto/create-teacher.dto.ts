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

// Un enseignant créé directement par l'admin doit avoir un dossier aussi
// complet qu'un candidat auto-inscrit via la vitrine (cf.
// CreatePublicTeacherApplicationDto) : mêmes champs obligatoires.
export class CreateTeacherDto {
  @IsString()
  @MinLength(2, { message: 'Le nom doit faire au moins 2 caractères' })
  @MaxLength(100)
  name: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Au moins une matière est requise' })
  @IsIn(SUBJECT_OPTIONS, { each: true, message: 'Matière inconnue' })
  subjects: string[];

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;

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
  @MinLength(1, { message: 'Le téléphone est obligatoire' })
  @MaxLength(20)
  phone: string;
}
