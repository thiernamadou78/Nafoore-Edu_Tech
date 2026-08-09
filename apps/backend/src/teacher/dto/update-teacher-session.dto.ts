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
  @Min(15)
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

  @IsOptional()
  @IsString()
  @MaxLength(500)
  cancellationReason?: string;
}
