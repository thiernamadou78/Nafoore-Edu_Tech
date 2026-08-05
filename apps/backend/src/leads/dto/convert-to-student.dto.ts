import { IsIn } from 'class-validator';

export class ConvertToStudentDto {
  @IsIn(['college', 'lycee'], {
    message: 'level doit être college ou lycee',
  })
  level: string;
}
