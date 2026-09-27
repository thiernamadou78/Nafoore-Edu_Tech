import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { GRADE_KINDS } from './create-grade.dto';

// Correction d'une note saisie par erreur : la matiere ne change pas (on
// supprime et on ressaisit dans ce cas).
export class UpdateGradeDto {
  @IsOptional()
  @IsIn(GRADE_KINDS, { message: 'Le type doit être "depart" ou "suivi"' })
  kind?: (typeof GRADE_KINDS)[number];

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'La dénomination de la note est obligatoire' })
  @MaxLength(80)
  label?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'La note doit être un nombre' })
  @Min(0, { message: 'La note ne peut pas être négative' })
  value?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Le barème doit être un nombre' })
  @Min(1)
  @Max(100)
  scale?: number;

  @IsOptional()
  @IsDateString({}, { message: "Date de l'évaluation invalide" })
  evaluatedAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  comment?: string;
}
