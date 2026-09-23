import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Permission } from '../auth/permissions';
import { CurrentAdmin } from '../auth/current-admin.decorator';
import { ZoneParams } from '../auth/zone.service';
import { RolesGuard } from '../auth/roles.guard';
import { AuthenticatedAdmin, SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { AdminMessagingService } from './admin-messaging.service';
import { UpdateSupportTicketDto } from './dto/update-support-ticket.dto';
import { ReplySupportTicketDto } from './dto/reply-support-ticket.dto';

@Permission('support')
@ZoneParams({ id: 'supportTicket' })
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Controller('admin/support-tickets')
export class AdminSupportTicketsController {
  constructor(private readonly adminMessagingService: AdminMessagingService) {}

  @Get()
  list(@CurrentAdmin() admin: AuthenticatedAdmin) {
    return this.adminMessagingService.listSupportTickets(admin);
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
