import { Controller, Get, UseGuards } from '@nestjs/common';
import { Permission } from '../auth/permissions';
import { RolesGuard } from '../auth/roles.guard';
import { CurrentAdmin } from '../auth/current-admin.decorator';
import { AuthenticatedAdmin, SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { DashboardService } from './dashboard.service';

@UseGuards(SupabaseAuthGuard, RolesGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Permission('dashboard')
  @Get()
  getSummary() {
    return this.dashboardService.getSummary();
  }

  // Accessible a tout admin : le contenu est filtre selon ses droits.
  @Get('notifications')
  getNotifications(@CurrentAdmin() admin: AuthenticatedAdmin) {
    return this.dashboardService.getNotifications(admin);
  }

  @Permission('dashboard')
  @Get('map')
  getMapData() {
    return this.dashboardService.getMapData();
  }

  @Permission('attendance')
  @Get('attendance-alerts')
  getAttendanceAlerts() {
    return this.dashboardService.getAttendanceAlerts();
  }
}
