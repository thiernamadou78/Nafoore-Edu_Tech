import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class UpdateLeadAddressDto {
  @IsString()
  @MinLength(1, { message: "L'adresse est obligatoire" })
  @MaxLength(300)
  address: string;

  // Ameliore la precision du geocodage (voir GeocodingService.geocode).
  @IsString()
  @Matches(/^\d{5}$/, { message: 'Le code postal doit contenir 5 chiffres' })
  postalCode: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;
}
