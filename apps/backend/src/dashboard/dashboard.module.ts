import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { CockpitService } from './cockpit.service';
import { AttendanceAdminModule } from '../attendance-admin/attendance-admin.module';

@Module({
  imports: [AttendanceAdminModule],
  controllers: [DashboardController],
  providers: [DashboardService, CockpitService],
})
export class DashboardModule {}
