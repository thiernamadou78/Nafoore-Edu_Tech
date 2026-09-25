import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
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
import { PrismaService } from '../prisma/prisma.service';
import { SessionChangesService } from '../session-changes/session-changes.service';
import { CurrentAdmin } from '../auth/current-admin.decorator';
import { Permission } from '../auth/permissions';
import { ZoneParams } from '../auth/zone.service';
import { RolesGuard } from '../auth/roles.guard';
import { AuthenticatedAdmin, SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { AssignTeachersDto } from './dto/assign-teachers.dto';
import { CreateStudentDto } from './dto/create-student.dto';
import { ListStudentsQueryDto } from './dto/list-students-query.dto';
import { SetActiveStudentDto } from './dto/set-active-student.dto';
import { SetAssignmentRateDto } from './dto/set-assignment-rate.dto';
import { UpdatePassStatusDto } from './dto/update-pass-status.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { StudentsService } from './students.service';

@Permission('students')
@ZoneParams({ id: 'student' })
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Controller('students')
export class StudentsController {
  constructor(
    private readonly studentsService: StudentsService,
    private readonly prisma: PrismaService,
    private readonly sessionChanges: SessionChangesService,
  ) {}

  @Get()
  list(@Query() query: ListStudentsQueryDto, @CurrentAdmin() admin: AuthenticatedAdmin) {
    return this.studentsService.list(query, admin);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.studentsService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateStudentDto) {
    return this.studentsService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateStudentDto) {
    return this.studentsService.update(id, dto);
  }

  @Patch(':id/active')
  setActive(@Param('id') id: string, @Body() dto: SetActiveStudentDto) {
    return this.studentsService.setActive(id, dto.isActive);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.studentsService.remove(id);
  }

  @Patch(':id/teachers')
  assignTeachers(
    @Param('id') id: string,
    @Body() dto: AssignTeachersDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.studentsService.assignTeachers(id, dto, admin.id);
  }

  @Patch(':id/teachers/:assignmentId/rate')
  setAssignmentRate(
    @Param('id') id: string,
    @Param('assignmentId') assignmentId: string,
    @Body() dto: SetAssignmentRateDto,
  ) {
    return this.studentsService.setAssignmentRate(id, assignmentId, dto.hourlyRate);
  }

  @Post(':id/photo')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  uploadPhoto(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    return this.studentsService.uploadPhoto(id, file);
  }

  @Delete(':id/photo')
  @HttpCode(HttpStatus.NO_CONTENT)
  removePhoto(@Param('id') id: string) {
    return this.studentsService.removePhoto(id);
  }

  // Arret d'un programme hebdomadaire par l'admin (motif obligatoire) :
  // seances a venir retirees, famille et enseignant prevenus.
  @Delete(':id/schedules/:scheduleId')
  async stopSchedule(
    @Param('id') id: string,
    @Param('scheduleId') scheduleId: string,
    @Query('reason') reason: string,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    const schedule = await this.prisma.recurringSchedule.findFirst({ where: { id: scheduleId, studentId: id } });
    if (!schedule) throw new NotFoundException('Programme introuvable');
    return this.sessionChanges.stopProgram(scheduleId, { kind: 'admin', name: admin.name }, reason);
  }

  @Post(':id/qr/regenerate')
  regenerateQrToken(@Param('id') id: string) {
    return this.studentsService.regenerateQrToken(id);
  }

  @Patch(':id/qr/status')
  setPassStatus(@Param('id') id: string, @Body() dto: UpdatePassStatusDto) {
    return this.studentsService.setPassStatus(id, dto.passStatus);
  }
}
