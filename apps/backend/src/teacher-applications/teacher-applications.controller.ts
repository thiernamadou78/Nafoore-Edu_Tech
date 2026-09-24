import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { CurrentAdmin } from '../auth/current-admin.decorator';
import { Permission } from '../auth/permissions';
import { ZoneParams } from '../auth/zone.service';
import { RolesGuard } from '../auth/roles.guard';
import { AuthenticatedAdmin, SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { TeacherOnboardingService } from '../onboarding/teacher-onboarding.service';
import { CreateTeacherApplicationDto } from './dto/create-teacher-application.dto';
import { DecisionDto } from './dto/decision.dto';
import { ListTeacherApplicationsQueryDto } from './dto/list-teacher-applications-query.dto';
import { ScheduleInterviewDto } from './dto/schedule-interview.dto';
import { UpdateNotesDto } from './dto/update-notes.dto';
import { UpdateTeacherApplicationProfileDto } from './dto/update-teacher-application-profile.dto';
import { TeacherApplicationDocumentsService } from './teacher-application-documents.service';
import { TeacherApplicationsService } from './teacher-applications.service';

@Permission('recruitment')
@ZoneParams({ id: 'application' })
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Controller('teacher-applications')
export class TeacherApplicationsController {
  constructor(
    private readonly activityLog: ActivityLogService,
    private readonly teacherApplicationsService: TeacherApplicationsService,
    private readonly teacherApplicationDocumentsService: TeacherApplicationDocumentsService,
    private readonly teacherOnboardingService: TeacherOnboardingService,
  ) {}

  @Get()
  list(
    @Query() query: ListTeacherApplicationsQueryDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.teacherApplicationsService.list(query, admin);
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

  @Patch(':id/profile')
  updateProfile(
    @Param('id') id: string,
    @Body() dto: UpdateTeacherApplicationProfileDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.teacherApplicationsService.updateProfile(id, dto, admin.id);
  }

  @Post(':id/photo')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  uploadPhoto(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    return this.teacherApplicationsService.uploadPhoto(id, file);
  }

  @Delete(':id/photo')
  @HttpCode(HttpStatus.NO_CONTENT)
  removePhoto(@Param('id') id: string) {
    return this.teacherApplicationsService.removePhoto(id);
  }

  @Patch(':id/decision')
  decide(
    @Param('id') id: string,
    @Body() dto: DecisionDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.teacherApplicationsService.decide(id, dto.status, admin.id);
  }

  // Consultation a l'ecran (plus de lien de telechargement), tracee.
  @Get(':id/documents/:documentId/view')
  @Header('Cache-Control', 'no-store, private')
  async viewDocument(
    @Param('id') id: string,
    @Param('documentId') documentId: string,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    const file = await this.teacherApplicationDocumentsService.getFileForView(id, documentId);
    await this.activityLog.log(admin.id, 'view_document', 'teacher_application_documents', documentId);
    return file;
  }

  @Delete(':id/documents/:documentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeDocument(@Param('id') id: string, @Param('documentId') documentId: string) {
    return this.teacherApplicationDocumentsService.remove(id, documentId);
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
