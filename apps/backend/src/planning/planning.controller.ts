import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';
import { CurrentAdmin } from '../auth/current-admin.decorator';
import { Permission } from '../auth/permissions';
import { RolesGuard } from '../auth/roles.guard';
import { AuthenticatedAdmin, SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { PlanningService } from './planning.service';

class PlanningQueryDto {
  @IsDateString()
  from: string;

  @IsDateString()
  to: string;

  @IsOptional()
  @IsString()
  teacherId?: string;

  @IsOptional()
  @IsString()
  studentId?: string;

  @IsOptional()
  @IsIn(['planifiee', 'confirmee', 'realisee', 'annulee', 'reportee'])
  status?: string;
}

// Planning global (toutes les seances, tous eleves et enseignants) pour
// l'admin, limite a la zone du delegue.
@Permission('planning')
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Controller('planning')
export class PlanningController {
  constructor(private readonly planning: PlanningService) {}

  @Get()
  list(@Query() query: PlanningQueryDto, @CurrentAdmin() admin: AuthenticatedAdmin) {
    const from = new Date(query.from);
    const to = new Date(query.to);
    if (to <= from || to.getTime() - from.getTime() > 45 * 24 * 3_600_000) {
      throw new BadRequestException('Période invalide (45 jours maximum)');
    }
    return this.planning.list(admin, { ...query, from, to });
  }
}
