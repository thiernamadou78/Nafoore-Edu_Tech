import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateStudentDto {
  @IsString()
  @MinLength(2, { message: 'Le nom doit faire au moins 2 caractères' })
  @MaxLength(100)
  name: string;

  @IsIn(['college', 'lycee'], { message: 'level doit être college ou lycee' })
  level: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  subjects?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  objectives?: string;

  @IsOptional()
  @IsString()
  parentLeadId?: string;
}
