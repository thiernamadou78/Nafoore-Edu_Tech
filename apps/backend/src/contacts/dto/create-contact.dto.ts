import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreateContactDto {
  @IsIn(['famille', 'mairie', 'entreprise', 'centre_formation_ecole_pro'], {
    message:
      'profile doit être famille, mairie, entreprise ou centre_formation_ecole_pro',
  })
  profile: string;

  @IsString()
  @MinLength(2, { message: 'Le nom doit faire au moins 2 caractères' })
  @MaxLength(100)
  name: string;

  @IsEmail({}, { message: 'Email invalide' })
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsString()
  @MinLength(10, { message: 'Le message doit faire au moins 10 caractères' })
  @MaxLength(2000)
  message: string;
}
