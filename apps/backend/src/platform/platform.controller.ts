import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { CurrentAdmin } from '../auth/current-admin.decorator';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AuthenticatedAdmin, SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { PlatformTimezoneService } from '../settings/platform-timezone.service';
import { RecurringScheduleService } from '../teacher/recurring-schedule.service';

class UpdateTimezoneDto {
  @IsString()
  @MaxLength(64)
  timezone: string;

  // Recaler aussi les seances a venir des programmes deja crees.
  @IsOptional()
  @IsBoolean()
  realign?: boolean;
}

// Reglages de la plateforme reserves au Super Admin.
@Roles('super_admin')
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Controller('admin/platform')
export class PlatformController {
  constructor(
    private readonly timezone: PlatformTimezoneService,
    private readonly schedules: RecurringScheduleService,
    private readonly activityLog: ActivityLogService,
  ) {}

  @Get('timezone')
  getTimezone() {
    return this.timezone.get();
  }

  @Patch('timezone')
  async setTimezone(@Body() dto: UpdateTimezoneDto, @CurrentAdmin() admin: AuthenticatedAdmin) {
    const result = await this.timezone.set(dto.timezone);
    await this.activityLog.log(admin.id, `set_platform_timezone:${dto.timezone}`, 'site_settings', 'platformTimezone');
    const realigned = dto.realign ? await this.schedules.realignAll() : null;
    return { ...result, realigned };
  }
}
