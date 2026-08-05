import {
  Body,
  Controller,
  Delete,
  Get,
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
import { CurrentAdmin } from '../auth/current-admin.decorator';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AuthenticatedAdmin, SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { AssignTeachersDto } from './dto/assign-teachers.dto';
import { CreateStudentDto } from './dto/create-student.dto';
import { ListStudentsQueryDto } from './dto/list-students-query.dto';
import { SetActiveStudentDto } from './dto/set-active-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { StudentsService } from './students.service';

@Roles('super_admin', 'admin')
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get()
  list(@Query() query: ListStudentsQueryDto) {
    return this.studentsService.list(query);
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
}
