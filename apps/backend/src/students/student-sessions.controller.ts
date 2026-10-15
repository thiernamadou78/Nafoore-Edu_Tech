import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { Permission } from '../auth/permissions';
import { ZoneParams } from '../auth/zone.service';
import { RolesGuard } from '../auth/roles.guard';
import { AuthenticatedAdmin, SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { CurrentAdmin } from '../auth/current-admin.decorator';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { AdminUpsertScheduleDto, CancelSessionDto, RescheduleSessionDto } from './dto/admin-session-change.dto';
import { StudentSessionsService } from './student-sessions.service';

@Permission('students')
@ZoneParams({ studentId: 'student' })
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Controller('students/:studentId/sessions')
export class StudentSessionsController {
  constructor(private readonly studentSessionsService: StudentSessionsService) {}

  @Get()
  list(@Param('studentId') studentId: string) {
    return this.studentSessionsService.list(studentId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Param('studentId') studentId: string, @Body() dto: CreateSessionDto) {
    return this.studentSessionsService.create(studentId, dto);
  }

  @Patch(':sessionId')
  update(
    @Param('studentId') studentId: string,
    @Param('sessionId') sessionId: string,
    @Body() dto: UpdateSessionDto,
  ) {
    return this.studentSessionsService.update(studentId, sessionId, dto);
  }

  // Decalage par l'equipe : motif envoye a la famille et a l'enseignant.
  @Post(':sessionId/reschedule')
  reschedule(
    @Param('studentId') studentId: string,
    @Param('sessionId') sessionId: string,
    @Body() dto: RescheduleSessionDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.studentSessionsService.reschedule(studentId, sessionId, dto, admin.name);
  }

  @Post(':sessionId/cancel')
  cancel(
    @Param('studentId') studentId: string,
    @Param('sessionId') sessionId: string,
    @Body() dto: CancelSessionDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.studentSessionsService.cancel(studentId, sessionId, dto, admin.name);
  }
}

// Programme hebdomadaire pose par l'equipe pour un eleve.
@Permission('students')
@ZoneParams({ studentId: 'student' })
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Controller('students/:studentId/schedules')
export class StudentSchedulesController {
  constructor(private readonly studentSessionsService: StudentSessionsService) {}

  @Put()
  upsert(@Param('studentId') studentId: string, @Body() dto: AdminUpsertScheduleDto) {
    return this.studentSessionsService.upsertSchedule(studentId, dto);
  }
}
