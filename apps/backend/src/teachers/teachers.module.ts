import { Module } from '@nestjs/common';
import { TeachersController } from './teachers.controller';
import { TeachersService } from './teachers.service';
import { TeacherDocumentsController } from './teacher-documents.controller';
import { TeacherDocumentsService } from './teacher-documents.service';
import { OnboardingModule } from '../onboarding/onboarding.module';

@Module({
  imports: [OnboardingModule],
  controllers: [TeachersController, TeacherDocumentsController],
  providers: [TeachersService, TeacherDocumentsService],
})
export class TeachersModule {}
