import { Module } from '@nestjs/common';
import { AdminMessageThreadsController } from './admin-message-threads.controller';
import { AdminSupportTicketsController } from './admin-support-tickets.controller';
import { AdminMessagingService } from './admin-messaging.service';

@Module({
  controllers: [AdminMessageThreadsController, AdminSupportTicketsController],
  providers: [AdminMessagingService],
})
export class AdminMessagingModule {}
