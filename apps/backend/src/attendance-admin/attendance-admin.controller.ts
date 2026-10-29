import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsDateString, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { Permission } from '../auth/permissions';
import { RolesGuard } from '../auth/roles.guard';
import { CurrentAdmin } from '../auth/current-admin.decorator';
import { AuthenticatedAdmin, SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { AttendanceAdminService } from './attendance-admin.service';

class ReasonDto {
  @IsString()
  @MinLength(2, { message: 'Indiquez un motif' })
  @MaxLength(500)
  reason: string;
}

class CloseDto extends ReasonDto {
  @IsDateString({}, { message: 'Heure de départ invalide' })
  checkoutAt: string;
}

class CorrectDto extends ReasonDto {
  @IsDateString({}, { message: "Heure d'arrivée invalide" })
  checkinAt: string;

  @IsOptional()
  @IsDateString({}, { message: 'Heure de départ invalide' })
  checkoutAt?: string;
}

class EnterDto extends ReasonDto {
  @IsDateString({}, { message: "Heure d'arrivée invalide" })
  checkinAt: string;

  @IsDateString({}, { message: 'Heure de départ invalide' })
  checkoutAt: string;
}

class RemindDto {
  @IsIn(['pointage', 'compte_rendu'])
  kind: 'pointage' | 'compte_rendu';
}

function parsePeriod(from?: string, to?: string) {
  const start = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 3_600_000);
  const end = to ? new Date(to) : new Date();
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    throw new BadRequestException('Période invalide');
  }
  if (end.getTime() - start.getTime() > 367 * 24 * 3_600_000) {
    throw new BadRequestException('Période trop longue (1 an maximum)');
  }
  return { start, end };
}

// Suivi des pointages par l'equipe : consultation (droit "Pointages" en
// lecture) et interventions (droit en modification), limitees a la zone.
@Permission('attendance')
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Controller('admin/attendance')
export class AttendanceAdminController {
  constructor(private readonly service: AttendanceAdminService) {}

  @Get('stats')
  stats(@CurrentAdmin() admin: AuthenticatedAdmin) {
    return this.service.stats(admin);
  }

  @Get('alert-count')
  alertCount(@CurrentAdmin() admin: AuthenticatedAdmin) {
    return this.service.alertCount(admin);
  }

  @Get('refused')
  refused(@CurrentAdmin() admin: AuthenticatedAdmin, @Query('from') from?: string, @Query('to') to?: string) {
    const { start, end } = parsePeriod(from, to);
    return this.service.refused(admin, start, end);
  }

  @Get('teachers/:teacherId/reliability')
  reliability(@CurrentAdmin() admin: AuthenticatedAdmin, @Param('teacherId') teacherId: string) {
    return this.service.teacherReliability(admin, teacherId);
  }

  @Post('logs/:logId/close')
  close(@CurrentAdmin() admin: AuthenticatedAdmin, @Param('logId') logId: string, @Body() dto: CloseDto) {
    return this.service.close(admin, logId, dto.checkoutAt, dto.reason.trim());
  }

  @Patch('logs/:logId')
  correct(@CurrentAdmin() admin: AuthenticatedAdmin, @Param('logId') logId: string, @Body() dto: CorrectDto) {
    return this.service.correct(admin, logId, dto.checkinAt, dto.checkoutAt, dto.reason.trim());
  }

  @Post('sessions/:sessionId/enter')
  enter(@CurrentAdmin() admin: AuthenticatedAdmin, @Param('sessionId') sessionId: string, @Body() dto: EnterDto) {
    return this.service.enter(admin, sessionId, dto.checkinAt, dto.checkoutAt, dto.reason.trim());
  }

  @Post('sessions/:sessionId/not-held')
  notHeld(@CurrentAdmin() admin: AuthenticatedAdmin, @Param('sessionId') sessionId: string, @Body() dto: ReasonDto) {
    return this.service.notHeld(admin, sessionId, dto.reason.trim());
  }

  // Limite pour eviter d'inonder un prof de relances.
  @Throttle({ default: { limit: 30, ttl: 3_600_000 } })
  @Post('sessions/:sessionId/remind')
  remind(@CurrentAdmin() admin: AuthenticatedAdmin, @Param('sessionId') sessionId: string, @Body() dto: RemindDto) {
    return this.service.remind(admin, sessionId, dto.kind);
  }
}
