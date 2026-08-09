import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentAdmin } from '../auth/current-admin.decorator';
import { AuthenticatedAdmin, SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { TeacherRequestsService } from './teacher-requests.service';
import { ListTeacherRequestsQueryDto } from './dto/list-teacher-requests-query.dto';
import { ProposeMatchingDto } from './dto/propose-matching.dto';

@Roles('super_admin', 'admin')
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Controller('teacher-requests')
export class AdminTeacherRequestsController {
  constructor(private readonly teacherRequests: TeacherRequestsService) {}

  @Get()
  list(@Query() query: ListTeacherRequestsQueryDto) {
    return this.teacherRequests.listForAdmin(query);
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
