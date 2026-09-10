import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
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
import { CreateTeacherDocumentDto } from './dto/create-teacher-document.dto';
import { TeacherDocumentsService } from './teacher-documents.service';

@Roles('super_admin', 'admin')
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Controller('teachers/:teacherId/documents')
export class TeacherDocumentsController {
  constructor(private readonly teacherDocumentsService: TeacherDocumentsService) {}

  @Get()
  list(@Param('teacherId') teacherId: string) {
    return this.teacherDocumentsService.list(teacherId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  upload(
    @Param('teacherId') teacherId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateTeacherDocumentDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.teacherDocumentsService.upload(teacherId, file, dto, admin.id);
  }

  @Get(':documentId/download')
  getDownloadUrl(
    @Param('teacherId') teacherId: string,
    @Param('documentId') documentId: string,
  ) {
    return this.teacherDocumentsService.getDownloadUrl(teacherId, documentId);
  }

  @Delete(':documentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('teacherId') teacherId: string, @Param('documentId') documentId: string) {
    return this.teacherDocumentsService.remove(teacherId, documentId);
  }
}
