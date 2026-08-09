import { Module } from '@nestjs/common';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';
import { StudentSessionsController } from './student-sessions.controller';
import { StudentSessionsService } from './student-sessions.service';
import { StudentProgressReportsController } from './student-progress-reports.controller';
import { StudentProgressReportsService } from './student-progress-reports.service';
import { StudentDocumentsController } from './student-documents.controller';
import { StudentDocumentsService } from './student-documents.service';
import { StudentProgressEntriesController } from './student-progress-entries.controller';
import { StudentProgressEntriesService } from './student-progress-entries.service';

@Module({
  controllers: [
    StudentsController,
    StudentSessionsController,
    StudentProgressReportsController,
    StudentDocumentsController,
    StudentProgressEntriesController,
  ],
  providers: [
    StudentsService,
    StudentSessionsService,
    StudentProgressReportsService,
    StudentDocumentsService,
    StudentProgressEntriesService,
  ],
  exports: [StudentsService],
})
export class StudentsModule {}
