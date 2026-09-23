import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentAdmin } from '../auth/current-admin.decorator';
import { AuthenticatedAdmin, SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { Permission } from '../auth/permissions';
import { ZoneParams } from '../auth/zone.service';
import { RolesGuard } from '../auth/roles.guard';
import { TeacherRequestsService } from './teacher-requests.service';
import { ListTeacherRequestsQueryDto } from './dto/list-teacher-requests-query.dto';
import { ProposeMatchingDto } from './dto/propose-matching.dto';
import { AssignTeacherDto } from './dto/assign-teacher.dto';

@Permission('teacher_requests')
@ZoneParams({ id: 'teacherRequest' })
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Controller('teacher-requests')
export class AdminTeacherRequestsController {
  constructor(private readonly teacherRequests: TeacherRequestsService) {}

  @Post('assign')
  assign(@Body() dto: AssignTeacherDto, @CurrentAdmin() admin: AuthenticatedAdmin) {
    return this.teacherRequests.assignTeacher(admin.id, dto);
  }

  @Get()
  list(@Query() query: ListTeacherRequestsQueryDto, @CurrentAdmin() admin: AuthenticatedAdmin) {
    return this.teacherRequests.listForAdmin(query, admin);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.teacherRequests.findOneForAdmin(id);
  }

  @Post(':id/matchings')
  proposeMatching(
    @Param('id') id: string,
    @Body() dto: ProposeMatchingDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.teacherRequests.proposeMatching(admin.id, id, dto);
  }
}
