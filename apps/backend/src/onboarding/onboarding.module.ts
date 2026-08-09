import { Module } from '@nestjs/common';
import { LeadOnboardingService } from './lead-onboarding.service';
import { TeacherOnboardingService } from './teacher-onboarding.service';

@Module({
  providers: [LeadOnboardingService, TeacherOnboardingService],
  exports: [LeadOnboardingService, TeacherOnboardingService],
})
export class OnboardingModule {}
