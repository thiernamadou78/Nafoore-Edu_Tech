import { Module } from '@nestjs/common';
import { PushController } from './push.controller';
import { PushService } from './push.service';
import { SessionReminderService } from './session-reminder.service';

@Module({
  controllers: [PushController],
  providers: [PushService, SessionReminderService],
})
export class PushModule {}
