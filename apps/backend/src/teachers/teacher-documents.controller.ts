import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
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
import { ActivityLogService } from '../activity-log/activity-log.service';
import { CurrentAdmin } from '../auth/current-admin.decorator';
import { Permission } from '../auth/permissions';
import { ZoneParams } from '../auth/zone.service';
import { RolesGuard } from '../auth/roles.guard';
import { AuthenticatedAdmin, SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { CreateTeacherDocumentDto } from './dto/create-teacher-document.dto';
import { TeacherDocumentsService } from './teacher-documents.service';

@Permission('teachers')
@ZoneParams({ teacherId: 'teacher' })
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Controller('teachers/:teacherId/documents')
export class TeacherDocumentsController {
  constructor(
    private readonly teacherDocumentsService: TeacherDocumentsService,
    private readonly activityLog: ActivityLogService,
  ) {}

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

  // Consultation a l'ecran (plus de lien de telechargement), tracee.
  @Get(':documentId/view')
  @Header('Cache-Control', 'no-store, private')
  async viewDocument(
    @Param('teacherId') teacherId: string,
    @Param('documentId') documentId: string,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    const file = await this.teacherDocumentsService.getFileForView(teacherId, documentId);
    await this.activityLog.log(admin.id, 'view_document', 'teacher_documents', documentId);
    return file;
  }

  @Delete(':documentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('teacherId') teacherId: string, @Param('documentId') documentId: string) {
    return this.teacherDocumentsService.remove(teacherId, documentId);
  }
}
