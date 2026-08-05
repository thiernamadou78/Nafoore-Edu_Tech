import { ArrayMinSize, IsArray, IsIn } from 'class-validator';
import { ADMIN_ROLE_NAMES } from './create-admin-account.dto';

export class UpdateRolesDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'Au moins un rôle est requis' })
  @IsIn(ADMIN_ROLE_NAMES, {
    each: true,
    message: `roles doit contenir uniquement : ${ADMIN_ROLE_NAMES.join(', ')}`,
  })
  roles: string[];
}
