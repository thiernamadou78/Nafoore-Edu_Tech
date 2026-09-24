import { Controller, Get, UseGuards } from '@nestjs/common';
import { Permission } from '../auth/permissions';
import { RolesGuard } from '../auth/roles.guard';
import { CurrentAdmin } from '../auth/current-admin.decorator';
import { AuthenticatedAdmin, SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { DashboardService } from './dashboard.service';
import { CockpitService } from './cockpit.service';

@UseGuards(SupabaseAuthGuard, RolesGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly cockpit: CockpitService,
  ) {}

  @Permission('dashboard')
  @Get()
  getSummary(@CurrentAdmin() admin: AuthenticatedAdmin) {
    return this.dashboardService.getSummary(admin);
  }

  // Accessible a tout admin : le contenu est filtre selon ses droits.
  @Get('notifications')
  getNotifications(@CurrentAdmin() admin: AuthenticatedAdmin) {
    return this.dashboardService.getNotifications(admin);
  }

  @Permission('dashboard')
  @Get('cockpit')
  getCockpit(@CurrentAdmin() admin: AuthenticatedAdmin) {
    return this.cockpit.get(admin);
  }

  @Permission('dashboard')
  @Get('map')
  getMapData(@CurrentAdmin() admin: AuthenticatedAdmin) {
    return this.dashboardService.getMapData(admin);
  }

  @Permission('attendance')
  @Get('attendance-alerts')
  getAttendanceAlerts(@CurrentAdmin() admin: AuthenticatedAdmin) {
    return this.dashboardService.getAttendanceAlerts(admin);
  }
}
