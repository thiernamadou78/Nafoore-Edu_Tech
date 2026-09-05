import { IsIn } from 'class-validator';

export class ConvertToStudentDto {
  @IsIn(['primaire', 'college', 'lycee'], {
    message: 'level doit être primaire, college ou lycee',
  })
  level: string;
}
