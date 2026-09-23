import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { Permission } from '../auth/permissions';
import { ZoneParams } from '../auth/zone.service';
import { RolesGuard } from '../auth/roles.guard';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { CurrentPortalAccount } from '../auth/current-portal-account.decorator';
import { AuthenticatedPortalAccount, PortalAuthGuard } from '../auth/portal-auth.guard';
import { PortalRoles } from '../auth/portal-roles.decorator';
import { PortalRolesGuard } from '../auth/portal-roles.guard';
import { CurrentTeacherAccount } from '../auth/current-teacher-account.decorator';
import { AuthenticatedTeacherAccount, TeacherAuthGuard } from '../auth/teacher-auth.guard';
import { GradesService } from './grades.service';
import { CreateGradeDto } from './dto/create-grade.dto';

@UseGuards(TeacherAuthGuard)
@Controller('teacher')
export class TeacherGradesController {
  constructor(private readonly grades: GradesService) {}

  @Get('students/:id/grades')
  progress(
    @Param('id') id: string,
    @CurrentTeacherAccount() teacherAccount: AuthenticatedTeacherAccount,
  ) {
    return this.grades.progressForTeacher(teacherAccount, id);
  }

  @Post('students/:id/grades')
  add(
    @Param('id') id: string,
    @Body() dto: CreateGradeDto,
    @CurrentTeacherAccount() teacherAccount: AuthenticatedTeacherAccount,
  ) {
    return this.grades.addGrade(teacherAccount, id, dto);
  }

  @Delete('grades/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id') id: string,
    @CurrentTeacherAccount() teacherAccount: AuthenticatedTeacherAccount,
  ) {
    return this.grades.deleteGrade(teacherAccount, id);
  }
}

@PortalRoles('famille')
@UseGuards(PortalAuthGuard, PortalRolesGuard)
@Controller('family')
export class FamilyGradesController {
  constructor(private readonly grades: GradesService) {}

  @Get('students/:id/progress')
  progress(
    @Param('id') id: string,
    @CurrentPortalAccount() portalAccount: AuthenticatedPortalAccount,
  ) {
    return this.grades.progressForFamily(portalAccount, id);
  }
}

@Permission('students')
@ZoneParams({ id: 'student' })
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Controller('students')
export class AdminGradesController {
  constructor(private readonly grades: GradesService) {}

  @Get(':id/progress')
  progress(@Param('id') id: string) {
    return this.grades.computeProgress(id);
  }
}
