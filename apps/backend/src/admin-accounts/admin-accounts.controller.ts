import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentAdmin } from '../auth/current-admin.decorator';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AuthenticatedAdmin, SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { AdminAccountsService } from './admin-accounts.service';
import { CreateAdminAccountDto } from './dto/create-admin-account.dto';
import { UpdateActiveDto } from './dto/update-active.dto';
import { UpdateRolesDto } from './dto/update-roles.dto';

@UseGuards(SupabaseAuthGuard, RolesGuard)
@Controller()
export class AdminAccountsController {
  constructor(private readonly adminAccountsService: AdminAccountsService) {}

  @Get('admin/me')
  getMe(@CurrentAdmin() admin: AuthenticatedAdmin) {
    const { roleNames, ...rest } = admin;
    return { ...rest, roles: roleNames };
  }

  @Roles('super_admin')
  @Get('admin-accounts')
  list() {
    return this.adminAccountsService.list();
  }

  @Roles('super_admin', 'admin')
  @Get('admin-accounts/assignable')
  listAssignable() {
    return this.adminAccountsService.listAssignable();
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
  @Patch('admin-accounts/:id/roles')
  updateRoles(
    @Param('id') id: string,
    @Body() dto: UpdateRolesDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.adminAccountsService.updateRoles(id, dto.roles, admin.id);
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
