import { Module } from '@nestjs/common';
import { AuthEmailsModule } from '../auth-emails/auth-emails.module';
import { AdminAccountsController } from './admin-accounts.controller';
import { AdminAccountsService } from './admin-accounts.service';

@Module({
  imports: [AuthEmailsModule],
  controllers: [AdminAccountsController],
  providers: [AdminAccountsService],
})
export class AdminAccountsModule {}
