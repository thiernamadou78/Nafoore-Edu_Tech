import { Module } from '@nestjs/common';
import { OnboardingModule } from '../onboarding/onboarding.module';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';

@Module({
  imports: [OnboardingModule],
  controllers: [LeadsController],
  providers: [LeadsService],
})
export class LeadsModule {}
