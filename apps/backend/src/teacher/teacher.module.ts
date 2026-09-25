import { Module } from '@nestjs/common';
import { TeacherController } from './teacher.controller';
import { TeacherService } from './teacher.service';
import { RecurringScheduleService } from './recurring-schedule.service';
import { AvailabilityService } from './availability.service';

@Module({
  controllers: [TeacherController],
  providers: [TeacherService, RecurringScheduleService, AvailabilityService],
  exports: [RecurringScheduleService],
})
export class TeacherModule {}
