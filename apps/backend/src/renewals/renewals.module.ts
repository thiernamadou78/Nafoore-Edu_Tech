import { Module } from '@nestjs/common';
import { RenewalsService } from './renewals.service';
import {
  AdminRenewalsController,
  FamilyRenewalsController,
  TeacherRenewalsController,
} from './renewals.controller';

@Module({
  controllers: [FamilyRenewalsController, TeacherRenewalsController, AdminRenewalsController],
  providers: [RenewalsService],
})
export class RenewalsModule {}
