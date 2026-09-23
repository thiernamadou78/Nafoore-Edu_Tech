import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentAdmin } from '../auth/current-admin.decorator';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AuthenticatedAdmin, SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { AdminAccountsService } from './admin-accounts.service';
import { CreateAdminAccountDto } from './dto/create-admin-account.dto';
import { UpdateActiveDto } from './dto/update-active.dto';
import { UpdateAdminAccountDto } from './dto/update-admin-account.dto';

@UseGuards(SupabaseAuthGuard, RolesGuard)
@Controller()
export class AdminAccountsController {
  constructor(private readonly adminAccountsService: AdminAccountsService) {}

  @Get('admin/me')
  getMe(@CurrentAdmin() admin: AuthenticatedAdmin) {
    const { roleNames, ...rest } = admin;
    return this.adminAccountsService.toDto({
      ...rest,
      roles: roleNames.map((name) => ({ role: { name } })),
    });
  }

  @Roles('super_admin')
  @Get('admin-accounts')
  list() {
    return this.adminAccountsService.list();
  }

  @Roles('super_admin')
  @Post('admin-accounts')
  create(
    @Body() dto: CreateAdminAccountDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.adminAccountsService.create(dto, admin.id);
  }

  @Roles('super_admin')
  @Patch('admin-accounts/:id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAdminAccountDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.adminAccountsService.update(id, dto, admin.id);
  }

  @Roles('super_admin')
  @Post('admin-accounts/:id/resend-invitation')
  @HttpCode(HttpStatus.NO_CONTENT)
  resendInvitation(@Param('id') id: string, @CurrentAdmin() admin: AuthenticatedAdmin) {
    return this.adminAccountsService.resendInvitation(id, admin.id);
  }

  @Roles('super_admin')
  @Patch('admin-accounts/:id/active')
  updateActive(
    @Param('id') id: string,
    @Body() dto: UpdateActiveDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.adminAccountsService.updateActive(id, dto.isActive, admin.id);
  }
}
