import { ArrayMinSize, IsArray, IsEmail, IsIn, IsString, Length, Matches, MaxLength, MinLength } from 'class-validator';
import { CONTACT_SERVICES } from '../../contacts/dto/create-contact.dto';
import { PHONE_ERROR_MESSAGE, PHONE_REGEX } from '../../common/phone';

// Meme exigences que le formulaire de contact public (CreateContactDto) pour
// le profil famille : une famille créée manuellement par l'admin doit avoir
// exactement les memes informations qu'une famille auto-inscrite, pas un
// dossier incomplet.
export class CreateFamilyLeadDto {
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

  @IsArray()
  @ArrayMinSize(1, { message: 'Choisissez au moins un service' })
  @IsIn(CONTACT_SERVICES, { each: true, message: 'Service invalide' })
  services: string[];

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
}
