import { IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateLeadAddressDto {
  @IsString()
  @MinLength(1, { message: "L'adresse est obligatoire" })
  @MaxLength(300)
  address: string;
}
