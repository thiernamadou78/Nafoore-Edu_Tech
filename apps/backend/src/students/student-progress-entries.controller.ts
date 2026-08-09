import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { CurrentAdmin } from '../auth/current-admin.decorator';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AuthenticatedAdmin, SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { UpsertProgressEntryDto } from './dto/upsert-progress-entry.dto';
import { StudentProgressEntriesService } from './student-progress-entries.service';

@Roles('super_admin', 'admin')
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Controller('students/:studentId/progress-entries')
export class StudentProgressEntriesController {
  constructor(
    private readonly studentProgressEntriesService: StudentProgressEntriesService,
  ) {}

  @Get()
  list(@Param('studentId') studentId: string) {
    return this.studentProgressEntriesService.list(studentId);
  }

  @Put()
  upsert(
    @Param('studentId') studentId: string,
    @Body() dto: UpsertProgressEntryDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.studentProgressEntriesService.upsert(studentId, dto, admin.id);
  }
}
