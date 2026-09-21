import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsString, Max, Min } from 'class-validator';
import { SUBJECT_OPTIONS } from '../../common/subjects';
import { TEACHER_REQUEST_PERIODS } from './create-teacher-request.dto';

// Assignation directe par l'admin : pas de demande de la famille, pas de
// confirmation a attendre — la famille est seulement prevenue par email.
export class AssignTeacherDto {
  @IsString()
  studentId: string;

  @IsString()
  teacherId: string;

  @IsIn(SUBJECT_OPTIONS, { message: 'Matière inconnue' })
  subject: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'Le tarif horaire est obligatoire' })
  @Min(1, { message: 'Le tarif horaire doit être supérieur à 0' })
  @Max(300, { message: 'Le tarif horaire semble trop élevé' })
  hourlyRate: number;

  @Type(() => Number)
  @IsIn(TEACHER_REQUEST_PERIODS, { message: 'La durée doit être 1, 2, 3 ou 6 mois' })
  periodMonths: number;
}
