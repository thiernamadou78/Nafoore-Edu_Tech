import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { UpsertRecurringScheduleDto } from '../../teacher/dto/upsert-recurring-schedule.dto';

// Decalage d'une seance par l'admin (nouvelle date, motif transmis a la
// famille et a l'enseignant).
export class RescheduleSessionDto {
  @IsDateString({}, { message: 'Nouvelle date invalide' })
  date: string;

  @IsOptional()
  @IsInt()
  @Min(30, { message: 'La durée minimale est de 30 minutes' })
  @Max(240)
  durationMinutes?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @IsOptional()
  @IsBoolean()
  confirmOutOfAvailability?: boolean;
}

export class CancelSessionDto {
  @IsString()
  @MinLength(2, { message: "Un motif d'annulation est requis" })
  @MaxLength(500)
  reason: string;
}

// Programme hebdomadaire pose par l'admin pour un couple eleve/enseignant/
// matiere : memes regles que cote enseignant, plus l'enseignant concerne.
export class AdminUpsertScheduleDto extends UpsertRecurringScheduleDto {
  @IsString()
  @MinLength(1, { message: 'Choisissez un enseignant' })
  teacherId: string;

  // Premiere seance du programme (sinon : des la semaine en cours).
  @IsOptional()
  @IsDateString({}, { message: 'Date de début invalide' })
  @Type(() => String)
  startsOn?: string;
}
