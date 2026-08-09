import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentTeacherAccount } from '../auth/current-teacher-account.decorator';
import { AuthenticatedTeacherAccount, TeacherAuthGuard } from '../auth/teacher-auth.guard';
import { TeacherService } from './teacher.service';
import { CreateTeacherSessionDto } from './dto/create-teacher-session.dto';
import { UpdateTeacherSessionDto } from './dto/update-teacher-session.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';

@UseGuards(TeacherAuthGuard)
@Controller('teacher')
export class TeacherController {
  constructor(private readonly teacherService: TeacherService) {}

  @Get('me')
  me(@CurrentTeacherAccount() teacherAccount: AuthenticatedTeacherAccount) {
    return this.teacherService.me(teacherAccount);
  }

  @Patch('me/password-changed')
  async passwordChanged(
    @CurrentTeacherAccount() teacherAccount: AuthenticatedTeacherAccount,
  ) {
    await this.teacherService.markPasswordChanged(teacherAccount.id);
    return { mustChangePassword: false };
  }

  @Get('students')
  listStudents(@CurrentTeacherAccount() teacherAccount: AuthenticatedTeacherAccount) {
    return this.teacherService.listMyStudents(teacherAccount);
  }

  @Get('students/:id')
  getStudent(
    @CurrentTeacherAccount() teacherAccount: AuthenticatedTeacherAccount,
    @Param('id') id: string,
  ) {
    return this.teacherService.getStudent(teacherAccount, id);
  }

  @Get('sessions')
  listSessions(@CurrentTeacherAccount() teacherAccount: AuthenticatedTeacherAccount) {
    return this.teacherService.listMySessions(teacherAccount);
  }

  @Post('sessions')
  createSession(
    @CurrentTeacherAccount() teacherAccount: AuthenticatedTeacherAccount,
    @Body() dto: CreateTeacherSessionDto,
  ) {
    return this.teacherService.createSession(teacherAccount, dto);
  }

  @Patch('sessions/:id')
  updateSession(
    @CurrentTeacherAccount() teacherAccount: AuthenticatedTeacherAccount,
    @Param('id') id: string,
    @Body() dto: UpdateTeacherSessionDto,
  ) {
    return this.teacherService.updateSession(teacherAccount, id, dto);
  }

  @Get('dashboard')
  getDashboard(@CurrentTeacherAccount() teacherAccount: AuthenticatedTeacherAccount) {
    return this.teacherService.getDashboard(teacherAccount);
  }

  @Get('payments')
  getPayments(@CurrentTeacherAccount() teacherAccount: AuthenticatedTeacherAccount) {
    return this.teacherService.getPayments(teacherAccount);
  }

  @Get('messages')
  listMessageThreads(@CurrentTeacherAccount() teacherAccount: AuthenticatedTeacherAccount) {
    return this.teacherService.listMyMessageThreads(teacherAccount);
  }

  @Post('messages/:threadId')
  sendMessage(
    @CurrentTeacherAccount() teacherAccount: AuthenticatedTeacherAccount,
    @Param('threadId') threadId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.teacherService.sendMessage(teacherAccount, threadId, dto);
  }

  @Post('messages/:threadId/read')
  markThreadRead(
    @CurrentTeacherAccount() teacherAccount: AuthenticatedTeacherAccount,
    @Param('threadId') threadId: string,
  ) {
    return this.teacherService.markThreadRead(teacherAccount, threadId);
  }

  @Get('messages/unread-count')
  getUnreadMessageCount(@CurrentTeacherAccount() teacherAccount: AuthenticatedTeacherAccount) {
    return this.teacherService.getUnreadMessageCount(teacherAccount);
  }

  @Get('reviews')
  listReviews(@CurrentTeacherAccount() teacherAccount: AuthenticatedTeacherAccount) {
    return this.teacherService.listMyReviews(teacherAccount);
  }

  @Post('support')
  createSupportTicket(
    @CurrentTeacherAccount() teacherAccount: AuthenticatedTeacherAccount,
    @Body() dto: CreateSupportTicketDto,
  ) {
    return this.teacherService.createSupportTicket(teacherAccount, dto);
  }

  @Post('reminders/simulate')
  simulateReminders(@CurrentTeacherAccount() teacherAccount: AuthenticatedTeacherAccount) {
    return this.teacherService.simulateReportReminders(teacherAccount);
  }
}
