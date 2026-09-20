import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import {
  TEACHER_REQUEST_DURATIONS,
  TEACHER_REQUEST_FORMATS,
  TEACHER_REQUEST_PERIODS,
} from './create-teacher-request.dto';

// La matiere n'est pas modifiable : pour une autre matiere, la famille annule
// et refait une demande (les profs proposes l'etaient pour la matiere d'origine).
export class UpdateTeacherRequestDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  frequency?: string;

  @IsOptional()
  @IsIn(TEACHER_REQUEST_FORMATS, { message: 'format doit être presentiel, distanciel ou hybride' })
  format?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  availability?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Date de début invalide' })
  desiredStartDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsIn(TEACHER_REQUEST_PERIODS, { message: "La durée d'accompagnement doit être 1, 2, 3 ou 6 mois" })
  periodMonths?: number;

  @IsOptional()
  @Type(() => Number)
  @IsIn(TEACHER_REQUEST_DURATIONS, { message: 'durationMinutes doit être 30, 45, 60, 90 ou 120' })
  durationMinutes?: number;
}
