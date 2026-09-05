import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateRhOwnerDto {
  @IsString()
  @MinLength(2, { message: 'Le nom doit faire au moins 2 caractères' })
  @MaxLength(100)
  fullName: string;

  @IsEmail({}, { message: 'Email invalide' })
  email: string;
}
