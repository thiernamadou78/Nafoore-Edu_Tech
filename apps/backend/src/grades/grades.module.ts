import { Module } from '@nestjs/common';
import { GradesService } from './grades.service';
import { MonthlyProgressService } from './monthly-progress.service';
import { AdminGradesController, FamilyGradesController, TeacherGradesController } from './grades.controller';

@Module({
  controllers: [TeacherGradesController, FamilyGradesController, AdminGradesController],
  providers: [GradesService, MonthlyProgressService],
})
export class GradesModule {}
