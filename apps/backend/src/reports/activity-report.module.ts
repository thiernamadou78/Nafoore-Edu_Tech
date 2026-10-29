import { Module } from '@nestjs/common';
import { ActivityReportController } from './activity-report.controller';
import { ActivityReportService } from './activity-report.service';

@Module({
  controllers: [ActivityReportController],
  providers: [ActivityReportService],
})
export class ActivityReportModule {}
