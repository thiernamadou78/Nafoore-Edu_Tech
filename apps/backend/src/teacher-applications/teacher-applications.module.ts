import { Module } from '@nestjs/common';
import { OnboardingModule } from '../onboarding/onboarding.module';
import { TeacherApplicationDocumentsService } from './teacher-application-documents.service';
import { TeacherApplicationsController } from './teacher-applications.controller';
import { TeacherApplicationsService } from './teacher-applications.service';

@Module({
  imports: [OnboardingModule],
  controllers: [TeacherApplicationsController],
  providers: [TeacherApplicationsService, TeacherApplicationDocumentsService],
})
export class TeacherApplicationsModule {}
