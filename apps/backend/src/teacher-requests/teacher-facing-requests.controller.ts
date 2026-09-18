import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentTeacherAccount } from '../auth/current-teacher-account.decorator';
import { AuthenticatedTeacherAccount, TeacherAuthGuard } from '../auth/teacher-auth.guard';
import { TeacherRequestsService } from './teacher-requests.service';

@UseGuards(TeacherAuthGuard)
@Controller('teacher')
export class TeacherFacingRequestsController {
  constructor(private readonly teacherRequestsService: TeacherRequestsService) {}

  @Get('open-requests')
  list(@CurrentTeacherAccount() teacherAccount: AuthenticatedTeacherAccount) {
    return this.teacherRequestsService.listOpenForTeacher(teacherAccount);
  }

  @Post('open-requests/:id/interest')
  expressInterest(
    @CurrentTeacherAccount() teacherAccount: AuthenticatedTeacherAccount,
    @Param('id') id: string,
  ) {
    return this.teacherRequestsService.reactToRequest(teacherAccount, id, true);
  }

  @Post('open-requests/:id/not-interested')
  declineRequest(
    @CurrentTeacherAccount() teacherAccount: AuthenticatedTeacherAccount,
    @Param('id') id: string,
  ) {
    return this.teacherRequestsService.reactToRequest(teacherAccount, id, false);
  }

  @Get('proposals')
  listProposals(@CurrentTeacherAccount() teacherAccount: AuthenticatedTeacherAccount) {
    return this.teacherRequestsService.listProposalsForTeacher(teacherAccount);
  }
}
