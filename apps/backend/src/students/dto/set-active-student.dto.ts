import { IsBoolean } from 'class-validator';

export class SetActiveStudentDto {
  @IsBoolean()
  isActive: boolean;
}
