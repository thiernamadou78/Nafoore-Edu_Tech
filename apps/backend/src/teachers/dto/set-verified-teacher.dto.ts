import { IsBoolean } from 'class-validator';

export class SetVerifiedTeacherDto {
  @IsBoolean()
  verified: boolean;
}
