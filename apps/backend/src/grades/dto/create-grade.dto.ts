import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { IsKnownSubject } from '../../common/subjects';

export const GRADE_KINDS = ['depart', 'suivi'] as const;

export class CreateGradeDto {
  @IsKnownSubject()
  subject: string;

  @IsIn(GRADE_KINDS, { message: 'Le type doit être "depart" ou "suivi"' })
  kind: (typeof GRADE_KINDS)[number];

  @Type(() => Number)
  @IsNumber({}, { message: 'La note doit être un nombre' })
  @Min(0, { message: 'La note ne peut pas être négative' })
  value: number;

  @Type(() => Number)
  @IsNumber({}, { message: 'Le barème doit être un nombre' })
  @Min(1)
  @Max(100)
  scale: number;

  @IsDateString({}, { message: "Date de l'évaluation invalide" })
  evaluatedAt: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  comment?: string;
}
