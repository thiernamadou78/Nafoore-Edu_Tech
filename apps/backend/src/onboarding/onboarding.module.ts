import { Module } from '@nestjs/common';
import { LeadOnboardingService } from './lead-onboarding.service';

@Module({
  providers: [LeadOnboardingService],
  exports: [LeadOnboardingService],
})
export class OnboardingModule {}
