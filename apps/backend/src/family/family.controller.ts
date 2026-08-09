import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentPortalAccount } from '../auth/current-portal-account.decorator';
import { AuthenticatedPortalAccount, PortalAuthGuard } from '../auth/portal-auth.guard';
import { PortalRoles } from '../auth/portal-roles.decorator';
import { PortalRolesGuard } from '../auth/portal-roles.guard';
import { CreateFamilyStudentDto } from './dto/create-family-student.dto';
import { SetFamilyNameDto } from './dto/set-family-name.dto';
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

  @Patch('me/family-name')
  async setFamilyName(
    @Body() dto: SetFamilyNameDto,
    @CurrentPortalAccount() portalAccount: AuthenticatedPortalAccount,
  ) {
    await this.familyService.setFamilyName(portalAccount.id, dto);
    return { familyName: dto.familyName };
  }

  @Get('students')
  listStudents(
    @CurrentPortalAccount() portalAccount: AuthenticatedPortalAccount,
  ) {
    return this.familyService.listMyStudents(portalAccount);
  }

  @Post('students')
  createStudent(
    @Body() dto: CreateFamilyStudentDto,
    @CurrentPortalAccount() portalAccount: AuthenticatedPortalAccount,
  ) {
    return this.familyService.createStudent(portalAccount, dto);
  }

  @Get('students/:id')
  getStudent(
    @Param('id') id: string,
    @CurrentPortalAccount() portalAccount: AuthenticatedPortalAccount,
  ) {
    return this.familyService.getStudent(portalAccount, id);
  }
}
