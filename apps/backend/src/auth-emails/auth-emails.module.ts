import { Module } from '@nestjs/common';
import { AuthEmailsController } from './auth-emails.controller';
import { AuthEmailsService } from './auth-emails.service';

@Module({
  controllers: [AuthEmailsController],
  providers: [AuthEmailsService],
  exports: [AuthEmailsService],
})
export class AuthEmailsModule {}
