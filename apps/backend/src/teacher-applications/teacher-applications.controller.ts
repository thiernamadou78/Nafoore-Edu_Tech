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
import { CreateTeacherApplicationDto } from './dto/create-teacher-application.dto';
import { DecisionDto } from './dto/decision.dto';
import { ListTeacherApplicationsQueryDto } from './dto/list-teacher-applications-query.dto';
import { ScheduleInterviewDto } from './dto/schedule-interview.dto';
import { UpdateNotesDto } from './dto/update-notes.dto';
import { TeacherApplicationsService } from './teacher-applications.service';

const RECRUITMENT_ROLES = ['super_admin', 'admin', 'recruiter'];

@Roles(...RECRUITMENT_ROLES)
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Controller('teacher-applications')
export class TeacherApplicationsController {
  constructor(
    private readonly teacherApplicationsService: TeacherApplicationsService,
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
}
