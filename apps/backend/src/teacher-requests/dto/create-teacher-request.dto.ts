import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { SUBJECT_OPTIONS } from '../../common/subjects';

export const TEACHER_REQUEST_FORMATS = ['presentiel', 'distanciel', 'hybride'] as const;
export const TEACHER_REQUEST_DURATIONS = [30, 45, 60, 90, 120] as const;

export class CreateTeacherRequestDto {
  @IsIn(SUBJECT_OPTIONS, { message: 'Matière inconnue' })
  subject: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  frequency: string;

  @IsIn(TEACHER_REQUEST_FORMATS, { message: 'format doit être presentiel, distanciel ou hybride' })
  format: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  availability?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Date de début invalide' })
  desiredStartDate?: string;

  // Duree de seance souhaitee : sert de defaut au prof pour le planning,
  // pour eviter qu'il ait a la redefinir lui-meme.
  @IsOptional()
  @Type(() => Number)
  @IsIn(TEACHER_REQUEST_DURATIONS, { message: 'durationMinutes doit être 30, 45, 60, 90 ou 120' })
  durationMinutes?: number;
}
