import { Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { CurrentPortalAccount } from '../auth/current-portal-account.decorator';
import { AuthenticatedPortalAccount, PortalAuthGuard } from '../auth/portal-auth.guard';
import { PortalRoles } from '../auth/portal-roles.decorator';
import { PortalRolesGuard } from '../auth/portal-roles.guard';
import { FamilyService } from './family.service';

@PortalRoles('famille')
@UseGuards(PortalAuthGuard, PortalRolesGuard)
@Controller('family')
export class FamilyController {
  constructor(private readonly familyService: FamilyService) {}

  @Get('me')
  me(@CurrentPortalAccount() portalAccount: AuthenticatedPortalAccount) {
    return this.familyService.me(portalAccount);
  }

  @Patch('me/password-changed')
  async passwordChanged(
    @CurrentPortalAccount() portalAccount: AuthenticatedPortalAccount,
  ) {
    await this.familyService.markPasswordChanged(portalAccount.id);
    return { mustChangePassword: false };
  }

  @Get('students')
  listStudents(
    @CurrentPortalAccount() portalAccount: AuthenticatedPortalAccount,
  ) {
    return this.familyService.listMyStudents(portalAccount);
  }

  @Get('students/:id')
  getStudent(
    @Param('id') id: string,
    @CurrentPortalAccount() portalAccount: AuthenticatedPortalAccount,
  ) {
    return this.familyService.getStudent(portalAccount, id);
  }
}
