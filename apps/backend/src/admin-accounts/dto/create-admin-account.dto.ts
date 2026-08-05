import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsIn,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export const ADMIN_ROLE_NAMES = ['super_admin', 'admin', 'recruiter'] as const;

export class CreateAdminAccountDto {
  @IsEmail({}, { message: 'Email invalide' })
  email: string;

  @IsString()
  @MinLength(2, { message: 'Le nom doit faire au moins 2 caractères' })
  @MaxLength(100)
  name: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Au moins un rôle est requis' })
  @IsIn(ADMIN_ROLE_NAMES, {
    each: true,
    message: `roles doit contenir uniquement : ${ADMIN_ROLE_NAMES.join(', ')}`,
  })
  roles: string[];
}
