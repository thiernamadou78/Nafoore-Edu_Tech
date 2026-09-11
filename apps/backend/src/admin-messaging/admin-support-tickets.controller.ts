import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { AdminMessagingService } from './admin-messaging.service';
import { UpdateSupportTicketDto } from './dto/update-support-ticket.dto';
import { ReplySupportTicketDto } from './dto/reply-support-ticket.dto';

@Roles('super_admin', 'admin')
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Controller('admin/support-tickets')
export class AdminSupportTicketsController {
  constructor(private readonly adminMessagingService: AdminMessagingService) {}

  @Get()
  list() {
    return this.adminMessagingService.listSupportTickets();
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSupportTicketDto) {
    return this.adminMessagingService.updateSupportTicket(id, dto);
  }

  @Post(':id/messages')
  reply(@Param('id') id: string, @Body() dto: ReplySupportTicketDto) {
    return this.adminMessagingService.replySupportTicket(id, dto);
  }
}
