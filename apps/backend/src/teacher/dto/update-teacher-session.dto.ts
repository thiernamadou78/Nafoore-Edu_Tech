import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { SESSION_STATUSES } from '../../students/dto/create-session.dto';

export class UpdateTeacherSessionDto {
  @IsOptional()
  @IsDateString({}, { message: 'date doit être une date ISO valide' })
  date?: string;

  @IsOptional()
  @IsInt()
  @Min(5, { message: 'La durée minimale est de 5 minutes' })
  @Max(240)
  durationMinutes?: number;

  @IsOptional()
  @IsIn(SESSION_STATUSES)
  status?: string;

  @IsOptional()
  @IsBoolean()
  attended?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  // Compte-rendu structure
  @IsOptional()
  @IsString()
  @MaxLength(200)
  chapter?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  topics?: string;

  @IsOptional()
  @IsInt()
  @Min(1, { message: 'La compréhension se note de 1 à 5' })
  @Max(5, { message: 'La compréhension se note de 1 à 5' })
  understanding?: number;

  @IsOptional()
  @IsInt()
  @Min(1, { message: 'La participation se note de 1 à 5' })
  @Max(5, { message: 'La participation se note de 1 à 5' })
  participation?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  difficulties?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  homework?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  cancellationReason?: string;

  // Motif d'un deplacement de seance (envoye a la famille et a l'admin).
  @IsOptional()
  @IsString()
  @MaxLength(500)
  changeReason?: string;
}
