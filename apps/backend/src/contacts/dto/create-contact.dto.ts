import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PHONE_ERROR_MESSAGE, PHONE_REGEX } from '../../common/phone';

export const CONTACT_SERVICES = [
  'aide_devoirs',
  'soutien_scolaire',
  'preparation_brevet',
  'preparation_bac',
  'coaching_methodologique',
  'stages_vacances',
  'accompagnement_bilingue',
] as const;

export class CreateContactDto {
  @IsIn(['famille', 'mairie', 'entreprise', 'centre_formation_ecole_pro'], {
    message:
      'profile doit être famille, mairie, entreprise ou centre_formation_ecole_pro',
  })
  profile: string;

  @IsIn(['homme', 'femme'], { message: 'genre doit être homme ou femme' })
  gender: string;

  @IsString()
  @MinLength(2, { message: 'Le nom doit faire au moins 2 caractères' })
  @MaxLength(100)
  name: string;

  @IsEmail({}, { message: 'Email invalide' })
  email: string;

  @IsString()
  @Matches(PHONE_REGEX, { message: PHONE_ERROR_MESSAGE })
  phone: string;

  @IsString()
  @MinLength(10, { message: 'Le message doit faire au moins 10 caractères' })
  @MaxLength(2000)
  message: string;

  // Sert a l'admin pour qualifier le contact et preparer un devis adapte.
  // Plusieurs possibles (ex: une famille avec des enfants aux besoins differents).
  @IsArray()
  @ArrayMinSize(1, { message: 'Choisissez au moins un service' })
  @IsIn(CONTACT_SERVICES, { each: true, message: 'Service invalide' })
  services: string[];

  // Obligatoire pour les familles (permet de proposer un enseignant proche
  // geographiquement) ; sans objet pour les autres profils (mairie,
  // entreprise, centre de formation).
  @ValidateIf((dto) => dto.profile === 'famille')
  @IsString()
  @MinLength(1, { message: "L'adresse est obligatoire" })
  @MaxLength(300)
  address?: string;

  // Ameliore la precision du geocodage (voir GeocodingService.geocode).
  @ValidateIf((dto) => dto.profile === 'famille')
  @IsString()
  @Matches(/^\d{5}$/, { message: 'Le code postal doit contenir 5 chiffres' })
  postalCode?: string;

  @IsOptional()
  @IsDateString()
  desiredStartDate?: string;

  // Uniquement pertinent pour le profil famille : combien d'enfants elle
  // souhaite inscrire.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  childrenCount?: number;
}
