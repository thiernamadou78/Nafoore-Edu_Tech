import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateFamilyLeadDto {
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
}
