import { IsString, MaxLength, MinLength } from 'class-validator';
import { AdminAccountSettingsDto } from './create-admin-account.dto';

export class UpdateAdminAccountDto extends AdminAccountSettingsDto {
  @IsString()
  @MinLength(2, { message: 'Le nom doit faire au moins 2 caractères' })
  @MaxLength(100)
  name: string;
}
