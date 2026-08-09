import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export const TEACHER_REQUEST_FORMATS = ['presentiel', 'distanciel'] as const;

export class CreateTeacherRequestDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  subject: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  frequency: string;

  @IsIn(TEACHER_REQUEST_FORMATS, { message: 'format doit être presentiel ou distanciel' })
  format: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  availability?: string;
}
