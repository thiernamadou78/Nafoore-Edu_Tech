import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentAdmin } from '../auth/current-admin.decorator';
import { AuthenticatedAdmin, SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { Permission } from '../auth/permissions';
import { RolesGuard } from '../auth/roles.guard';
import { CurrentPortalAccount } from '../auth/current-portal-account.decorator';
import { AuthenticatedPortalAccount, PortalAuthGuard } from '../auth/portal-auth.guard';
import { PortalRoles } from '../auth/portal-roles.decorator';
import { PortalRolesGuard } from '../auth/portal-roles.guard';
import { CurrentTeacherAccount } from '../auth/current-teacher-account.decorator';
import { AuthenticatedTeacherAccount, TeacherAuthGuard } from '../auth/teacher-auth.guard';
import { RenewalsService } from './renewals.service';
import { RequestRenewalDto } from './dto/request-renewal.dto';
import { RespondRenewalDto } from './dto/respond-renewal.dto';
import { RejectRenewalDto } from './dto/reject-renewal.dto';

@PortalRoles('famille')
@UseGuards(PortalAuthGuard, PortalRolesGuard)
@Controller('family')
export class FamilyRenewalsController {
  constructor(private readonly renewals: RenewalsService) {}

  @Post('student-teachers/:id/renewal')
  request(
    @Param('id') id: string,
    @Body() dto: RequestRenewalDto,
    @CurrentPortalAccount() portalAccount: AuthenticatedPortalAccount,
  ) {
    return this.renewals.requestRenewal(portalAccount, id, dto.periodMonths);
  }
}

@UseGuards(TeacherAuthGuard)
@Controller('teacher/renewals')
export class TeacherRenewalsController {
  constructor(private readonly renewals: RenewalsService) {}

  @Get()
  list(@CurrentTeacherAccount() teacherAccount: AuthenticatedTeacherAccount) {
    return this.renewals.listForTeacher(teacherAccount);
  }

  @Patch(':id/respond')
  respond(
    @Param('id') id: string,
    @Body() dto: RespondRenewalDto,
    @CurrentTeacherAccount() teacherAccount: AuthenticatedTeacherAccount,
  ) {
    return this.renewals.respondAsTeacher(teacherAccount, id, dto.accept, dto.comment);
  }
}

@Permission('renewals')
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Controller('renewals')
export class AdminRenewalsController {
  constructor(private readonly renewals: RenewalsService) {}

  @Get()
  list() {
    return this.renewals.listForAdmin();
  }

  @Patch(':id/confirm')
  confirm(@Param('id') id: string, @CurrentAdmin() admin: AuthenticatedAdmin) {
    return this.renewals.confirm(admin.id, id);
  }

  @Patch(':id/reject')
  reject(
    @Param('id') id: string,
    @Body() dto: RejectRenewalDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.renewals.reject(admin.id, id, dto.reason);
  }
}
