import {
  IsArray,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ALL_PERMISSIONS } from '../../auth/permissions';

export const ADMIN_ROLE_NAMES = ['super_admin', 'admin'] as const;

export class AdminAccountSettingsDto {
  @IsIn(ADMIN_ROLE_NAMES, { message: 'Le type de compte doit être super_admin ou admin' })
  role: (typeof ADMIN_ROLE_NAMES)[number];

  @IsArray()
  @IsIn(ALL_PERMISSIONS, { each: true, message: 'Droit inconnu' })
  permissions: string[];

  // Zone du delegue : adresse + rayon. Adresse vide = toutes zones.
  @IsOptional()
  @IsString()
  @MaxLength(300)
  zoneAddress?: string | null;

  @IsOptional()
  @IsInt({ message: 'Le rayon doit être un nombre entier de km' })
  @Min(1, { message: 'Le rayon doit faire au moins 1 km' })
  @Max(2000, { message: 'Le rayon ne peut pas dépasser 2000 km' })
  zoneRadiusKm?: number | null;
}

export class CreateAdminAccountDto extends AdminAccountSettingsDto {
  @IsEmail({}, { message: 'Email invalide' })
  email: string;

  @IsString()
  @MinLength(2, { message: 'Le nom doit faire au moins 2 caractères' })
  @MaxLength(100)
  name: string;
}
