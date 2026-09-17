import { Controller, Get, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { DashboardService } from './dashboard.service';

@Roles('super_admin', 'admin')
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  getSummary() {
    return this.dashboardService.getSummary();
  }

  @Get('notifications')
  getNotifications() {
    return this.dashboardService.getNotifications();
  }

  @Get('map')
  getMapData() {
    return this.dashboardService.getMapData();
  }

  @Get('attendance-alerts')
  getAttendanceAlerts() {
    return this.dashboardService.getAttendanceAlerts();
  }
}
