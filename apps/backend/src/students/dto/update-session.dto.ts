import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { SESSION_STATUSES } from './create-session.dto';

export class UpdateSessionDto {
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
}
