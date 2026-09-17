import { Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentTeacherAccount } from '../auth/current-teacher-account.decorator';
import { AuthenticatedTeacherAccount, TeacherAuthGuard } from '../auth/teacher-auth.guard';
import { TeacherRequestsService } from './teacher-requests.service';

@UseGuards(TeacherAuthGuard)
@Controller('teacher/open-requests')
export class TeacherFacingRequestsController {
  constructor(private readonly teacherRequestsService: TeacherRequestsService) {}

  @Get()
  list(@CurrentTeacherAccount() teacherAccount: AuthenticatedTeacherAccount) {
    return this.teacherRequestsService.listOpenForTeacher(teacherAccount);
  }

  @Post(':id/interest')
  expressInterest(
    @CurrentTeacherAccount() teacherAccount: AuthenticatedTeacherAccount,
    @Param('id') id: string,
  ) {
    return this.teacherRequestsService.expressInterest(teacherAccount, id);
  }

  @Delete(':id/interest')
  withdrawInterest(
    @CurrentTeacherAccount() teacherAccount: AuthenticatedTeacherAccount,
    @Param('id') id: string,
  ) {
    return this.teacherRequestsService.withdrawInterest(teacherAccount, id);
  }
}
