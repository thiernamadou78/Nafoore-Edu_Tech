import { Body, Controller, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentPortalAccount } from '../auth/current-portal-account.decorator';
import { AuthenticatedPortalAccount, PortalAuthGuard } from '../auth/portal-auth.guard';
import { PortalRoles } from '../auth/portal-roles.decorator';
import { PortalRolesGuard } from '../auth/portal-roles.guard';
import { TeacherRequestsService } from './teacher-requests.service';
import { CreateTeacherRequestDto } from './dto/create-teacher-request.dto';
import { RefuseMatchingDto } from './dto/refuse-matching.dto';

@PortalRoles('famille')
@UseGuards(PortalAuthGuard, PortalRolesGuard)
@Controller('family')
export class FamilyTeacherRequestsController {
  constructor(private readonly teacherRequests: TeacherRequestsService) {}

  @Post('students/:studentId/teacher-requests')
  createRequest(
    @Param('studentId') studentId: string,
    @Body() dto: CreateTeacherRequestDto,
    @CurrentPortalAccount() portalAccount: AuthenticatedPortalAccount,
  ) {
    return this.teacherRequests.createRequest(portalAccount, studentId, dto);
  }

  @Patch('matchings/:matchingId/accept')
  acceptMatching(
    @Param('matchingId') matchingId: string,
    @CurrentPortalAccount() portalAccount: AuthenticatedPortalAccount,
  ) {
    return this.teacherRequests.acceptMatching(portalAccount, matchingId);
  }

  @Patch('matchings/:matchingId/refuse')
  refuseMatching(
    @Param('matchingId') matchingId: string,
    @Body() dto: RefuseMatchingDto,
    @CurrentPortalAccount() portalAccount: AuthenticatedPortalAccount,
  ) {
    return this.teacherRequests.refuseMatching(portalAccount, matchingId, dto);
  }
}
