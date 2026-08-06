import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateStudentDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Le nom doit faire au moins 2 caractères' })
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsIn(['college', 'lycee'], { message: 'level doit être college ou lycee' })
  level?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  school?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  subjects?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  objectives?: string;
}
