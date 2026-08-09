import { Module } from '@nestjs/common';
import { StudentsModule } from '../students/students.module';
import { TeacherRequestsService } from './teacher-requests.service';
import { FamilyTeacherRequestsController } from './family-teacher-requests.controller';
import { AdminTeacherRequestsController } from './admin-teacher-requests.controller';

@Module({
  imports: [StudentsModule],
  controllers: [FamilyTeacherRequestsController, AdminTeacherRequestsController],
  providers: [TeacherRequestsService],
})
export class TeacherRequestsModule {}
