import { Module } from '@nestjs/common';
import { AttendanceAdminController } from './attendance-admin.controller';
import { AttendanceAdminService } from './attendance-admin.service';

@Module({
  controllers: [AttendanceAdminController],
  providers: [AttendanceAdminService],
  exports: [AttendanceAdminService],
})
export class AttendanceAdminModule {}
