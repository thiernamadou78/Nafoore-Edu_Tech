import { Global, Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { ResendEmailService } from './resend-email.service';
import { AdminNotificationService } from './admin-notification.service';
import { SessionNotifierService } from './session-notifier.service';

@Global()
@Module({
  providers: [
    { provide: EmailService, useClass: ResendEmailService },
    AdminNotificationService,
    SessionNotifierService,
  ],
  exports: [EmailService, AdminNotificationService, SessionNotifierService],
})
export class EmailModule {}
