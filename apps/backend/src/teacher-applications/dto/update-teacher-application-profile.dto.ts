import { IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateTeacherApplicationProfileDto {
  @IsString()
  @MinLength(20, { message: 'La bio doit faire au moins 20 caractères' })
  @MaxLength(2000)
  bio: string;
}
