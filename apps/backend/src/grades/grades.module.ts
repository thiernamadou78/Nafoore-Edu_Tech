import { Module } from '@nestjs/common';
import { GradesService } from './grades.service';
import { AdminGradesController, FamilyGradesController, TeacherGradesController } from './grades.controller';

@Module({
  controllers: [TeacherGradesController, FamilyGradesController, AdminGradesController],
  providers: [GradesService],
})
export class GradesModule {}
