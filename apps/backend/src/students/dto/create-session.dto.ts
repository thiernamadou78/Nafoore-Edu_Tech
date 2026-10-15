import { IsBoolean, IsDateString, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export const SESSION_STATUSES = [
  'planifiee',
  'confirmee',
  'realisee',
  'annulee',
  'reportee',
] as const;

export class CreateSessionDto {
  @IsDateString({}, { message: 'date doit être une date ISO valide' })
  date: string;

  @IsOptional()
  @IsString()
  teacherId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  subject?: string;

  @IsOptional()
  @IsIn(SESSION_STATUSES)
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  // Memes durees que cote enseignant (30 min a 2 h ; 4 h max).
  @IsOptional()
  @IsInt()
  @Min(30, { message: 'La durée minimale est de 30 minutes' })
  @Max(240)
  durationMinutes?: number;

  // L'admin a vu l'alerte "hors disponibilites" et confirme quand meme.
  @IsOptional()
  @IsBoolean()
  confirmOutOfAvailability?: boolean;
}
