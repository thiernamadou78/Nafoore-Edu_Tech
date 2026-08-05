import { IsDateString, IsIn, IsOptional } from 'class-validator';
import { LEAD_STATUSES } from './update-lead-status.dto';

export class ListLeadsQueryDto {
  @IsOptional()
  @IsIn(['famille', 'mairie', 'entreprise', 'centre_formation_ecole_pro'])
  profile?: string;

  @IsOptional()
  @IsIn(LEAD_STATUSES)
  status?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
