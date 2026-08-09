import { IsDateString, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

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
}
