import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentAdmin } from '../auth/current-admin.decorator';
import { Permission } from '../auth/permissions';
import { RolesGuard } from '../auth/roles.guard';
import { AuthenticatedAdmin, SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { CreateProgressReportDto } from './dto/create-progress-report.dto';
import { StudentProgressReportsService } from './student-progress-reports.service';

@Permission('students')
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Controller('students/:studentId/progress-reports')
export class StudentProgressReportsController {
  constructor(
    private readonly studentProgressReportsService: StudentProgressReportsService,
  ) {}

  @Get()
  list(@Param('studentId') studentId: string) {
    return this.studentProgressReportsService.list(studentId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Param('studentId') studentId: string,
    @Body() dto: CreateProgressReportDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.studentProgressReportsService.create(studentId, dto, admin.id);
  }
}
