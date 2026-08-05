import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { StudentSessionsService } from './student-sessions.service';

@Roles('super_admin', 'admin')
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
}
