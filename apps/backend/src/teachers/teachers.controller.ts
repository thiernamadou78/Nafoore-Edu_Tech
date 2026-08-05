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
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { ListTeachersQueryDto } from './dto/list-teachers-query.dto';
import { SetVerifiedTeacherDto } from './dto/set-verified-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { TeachersService } from './teachers.service';

@Roles('super_admin', 'admin')
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Controller('teachers')
export class TeachersController {
  constructor(private readonly teachersService: TeachersService) {}

  @Get()
  list(@Query() query: ListTeachersQueryDto) {
    return this.teachersService.list(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.teachersService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateTeacherDto) {
    return this.teachersService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTeacherDto) {
    return this.teachersService.update(id, dto);
  }

  @Patch(':id/verified')
  setVerified(@Param('id') id: string, @Body() dto: SetVerifiedTeacherDto) {
    return this.teachersService.setVerified(id, dto.verified);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.teachersService.remove(id);
  }

  @Post(':id/photo')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  uploadPhoto(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    return this.teachersService.uploadPhoto(id, file);
  }

  @Delete(':id/photo')
  @HttpCode(HttpStatus.NO_CONTENT)
  removePhoto(@Param('id') id: string) {
    return this.teachersService.removePhoto(id);
  }
}
