import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateFamilyStudentDto {
  @IsString()
  @MinLength(2, { message: 'Le nom doit faire au moins 2 caractères' })
  @MaxLength(100)
  name: string;

  @IsIn(['primaire', 'college', 'lycee'], { message: 'level doit être primaire, college ou lycee' })
  level: string;

  @IsIn(
    ['cp', 'ce1', 'ce2', 'cm1', 'cm2', '6e', '5e', '4e', '3e', '2nde', '1re', 'terminale'],
    { message: 'La classe est obligatoire' },
  )
  classe: string;

  @IsString()
  @IsNotEmpty({ message: "L'école est obligatoire" })
  @MaxLength(200)
  school: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  subjects?: string[];
}
