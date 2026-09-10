import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CurrentTeacherAccount } from '../auth/current-teacher-account.decorator';
import { AuthenticatedTeacherAccount, TeacherAuthGuard } from '../auth/teacher-auth.guard';
import { TeacherService } from './teacher.service';
import { RecurringScheduleService } from './recurring-schedule.service';
import { CreateTeacherSessionDto } from './dto/create-teacher-session.dto';
import { UpdateTeacherSessionDto } from './dto/update-teacher-session.dto';
import { UpsertRecurringScheduleDto } from './dto/upsert-recurring-schedule.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { StartThreadDto } from './dto/start-thread.dto';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';
import { UpsertProgressEntryDto } from '../students/dto/upsert-progress-entry.dto';

@UseGuards(TeacherAuthGuard)
@Controller('teacher')
export class TeacherController {
  constructor(
    private readonly teacherService: TeacherService,
    private readonly recurringScheduleService: RecurringScheduleService,
  ) {}

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

  @Get('students/:id/progress-entries')
  listProgressEntries(
    @CurrentTeacherAccount() teacherAccount: AuthenticatedTeacherAccount,
    @Param('id') id: string,
  ) {
    return this.teacherService.listProgressEntries(teacherAccount, id);
  }

  @Put('students/:id/progress-entries')
  upsertProgressEntry(
    @CurrentTeacherAccount() teacherAccount: AuthenticatedTeacherAccount,
    @Param('id') id: string,
    @Body() dto: UpsertProgressEntryDto,
  ) {
    return this.teacherService.upsertProgressEntry(teacherAccount, id, dto);
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

  @Put('students/:id/schedule')
  upsertSchedule(
    @CurrentTeacherAccount() teacherAccount: AuthenticatedTeacherAccount,
    @Param('id') id: string,
    @Body() dto: UpsertRecurringScheduleDto,
  ) {
    return this.recurringScheduleService.upsert(teacherAccount, id, dto);
  }

  @Delete('students/:id/schedule')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeSchedule(
    @CurrentTeacherAccount() teacherAccount: AuthenticatedTeacherAccount,
    @Param('id') id: string,
    @Query('subject') subject: string,
  ) {
    return this.recurringScheduleService.remove(teacherAccount, id, subject);
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

  @Post('messages')
  startThread(
    @CurrentTeacherAccount() teacherAccount: AuthenticatedTeacherAccount,
    @Body() dto: StartThreadDto,
  ) {
    return this.teacherService.startOrGetThread(teacherAccount, dto);
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
