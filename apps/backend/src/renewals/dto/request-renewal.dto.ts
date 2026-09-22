import { Type } from 'class-transformer';
import { IsIn } from 'class-validator';
import { TEACHER_REQUEST_PERIODS } from '../../teacher-requests/dto/create-teacher-request.dto';

export class RequestRenewalDto {
  @Type(() => Number)
  @IsIn(TEACHER_REQUEST_PERIODS, { message: 'La durée doit être 1, 2, 3, 6 ou 9 mois' })
  periodMonths: number;
}
