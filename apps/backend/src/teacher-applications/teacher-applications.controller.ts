import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentAdmin } from '../auth/current-admin.decorator';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AuthenticatedAdmin, SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { TeacherOnboardingService } from '../onboarding/teacher-onboarding.service';
import { CreateTeacherApplicationDto } from './dto/create-teacher-application.dto';
import { DecisionDto } from './dto/decision.dto';
import { ListTeacherApplicationsQueryDto } from './dto/list-teacher-applications-query.dto';
import { ScheduleInterviewDto } from './dto/schedule-interview.dto';
import { UpdateNotesDto } from './dto/update-notes.dto';
import { TeacherApplicationDocumentsService } from './teacher-application-documents.service';
import { TeacherApplicationsService } from './teacher-applications.service';

const RECRUITMENT_ROLES = ['super_admin', 'admin', 'recruiter'];

@Roles(...RECRUITMENT_ROLES)
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Controller('teacher-applications')
export class TeacherApplicationsController {
  constructor(
    private readonly teacherApplicationsService: TeacherApplicationsService,
    private readonly teacherApplicationDocumentsService: TeacherApplicationDocumentsService,
    private readonly teacherOnboardingService: TeacherOnboardingService,
  ) {}

  @Get()
  list(@Query() query: ListTeacherApplicationsQueryDto) {
    return this.teacherApplicationsService.list(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.teacherApplicationsService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateTeacherApplicationDto) {
    return this.teacherApplicationsService.create(dto);
  }

  @Patch(':id/schedule-interview')
  scheduleInterview(
    @Param('id') id: string,
    @Body() dto: ScheduleInterviewDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.teacherApplicationsService.scheduleInterview(
      id,
      dto.interviewDate,
      admin.id,
    );
  }

  @Patch(':id/notes')
  updateNotes(
    @Param('id') id: string,
    @Body() dto: UpdateNotesDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.teacherApplicationsService.updateNotes(
      id,
      dto.interviewNotes,
      admin.id,
    );
  }

  @Patch(':id/decision')
  decide(
    @Param('id') id: string,
    @Body() dto: DecisionDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.teacherApplicationsService.decide(id, dto.status, admin.id);
  }

  // Restriction volontaire : super_admin/recruiter uniquement, PAS 'admin'
  // générique — documents sensibles (diplômes, casier judiciaire).
  @Roles('super_admin', 'recruiter')
  @Get(':id/documents/:documentId/download')
  downloadDocument(
    @Param('id') id: string,
    @Param('documentId') documentId: string,
  ) {
    return this.teacherApplicationDocumentsService.getDownloadUrl(id, documentId);
  }

  @Post(':id/create-account')
  createAccount(
    @Param('id') id: string,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.teacherOnboardingService.createAccount(id, admin.id);
  }

  @Post(':id/resend-credentials')
  resendCredentials(
    @Param('id') id: string,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.teacherOnboardingService.resendCredentials(id, admin.id);
  }
}
