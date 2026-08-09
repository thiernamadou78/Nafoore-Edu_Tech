import { IsDateString, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateTeacherSessionDto {
  @IsString()
  studentId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  subject: string;

  @IsDateString({}, { message: 'date doit être une date ISO valide' })
  date: string;

  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(240)
  durationMinutes?: number;
}
