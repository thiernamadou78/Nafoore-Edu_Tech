import { Global, Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { ResendEmailService } from './resend-email.service';
import { AdminNotificationService } from './admin-notification.service';

@Global()
@Module({
  providers: [
    { provide: EmailService, useClass: ResendEmailService },
    AdminNotificationService,
  ],
  exports: [EmailService, AdminNotificationService],
})
export class EmailModule {}
