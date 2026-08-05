import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateTeacherApplicationDto {
  @IsString()
  @MinLength(2, { message: 'Le nom doit faire au moins 2 caractères' })
  @MaxLength(100)
  candidateName: string;

  @IsEmail({}, { message: 'Email invalide' })
  candidateEmail: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Au moins une matière est requise' })
  @IsString({ each: true })
  subjects: string[];

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  zone: string;
}
