import { IsIn } from 'class-validator';

export class UpdatePassStatusDto {
  @IsIn(['active', 'revoked'], { message: 'passStatus doit être active ou revoked' })
  passStatus: string;
}
