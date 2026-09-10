import { Module } from '@nestjs/common';
import { TeachersController } from './teachers.controller';
import { TeachersService } from './teachers.service';
import { TeacherDocumentsController } from './teacher-documents.controller';
import { TeacherDocumentsService } from './teacher-documents.service';

@Module({
  controllers: [TeachersController, TeacherDocumentsController],
  providers: [TeachersService, TeacherDocumentsService],
})
export class TeachersModule {}
