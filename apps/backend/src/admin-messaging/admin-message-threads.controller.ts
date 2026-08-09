import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { CurrentAdmin } from '../auth/current-admin.decorator';
import { AuthenticatedAdmin } from '../auth/supabase-auth.guard';
import { AdminMessagingService } from './admin-messaging.service';
import { ModerateMessageDto } from './dto/moderate-message.dto';

@Roles('super_admin', 'admin')
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Controller('admin/message-threads')
export class AdminMessageThreadsController {
  constructor(private readonly adminMessagingService: AdminMessagingService) {}

  @Get()
  list() {
    return this.adminMessagingService.listThreads();
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.adminMessagingService.getThread(id);
  }

  @Post('messages/:messageId/moderate')
  moderate(
    @Param('messageId') messageId: string,
    @Body() dto: ModerateMessageDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.adminMessagingService.moderateMessage(messageId, admin.id, dto);
  }
}
