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
import { CreateDocumentDto } from './dto/create-document.dto';
import { StudentDocumentsService } from './student-documents.service';

@Permission('students')
@ZoneParams({ studentId: 'student' })
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Controller('students/:studentId/documents')
export class StudentDocumentsController {
  constructor(
    private readonly studentDocumentsService: StudentDocumentsService,
    private readonly activityLog: ActivityLogService,
  ) {}

  @Get()
  list(@Param('studentId') studentId: string) {
    return this.studentDocumentsService.list(studentId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  upload(
    @Param('studentId') studentId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateDocumentDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.studentDocumentsService.upload(studentId, file, dto, admin.id);
  }

  // Consultation a l'ecran (plus de lien de telechargement), tracee.
  @Get(':documentId/view')
  @Header('Cache-Control', 'no-store, private')
  async viewDocument(
    @Param('studentId') studentId: string,
    @Param('documentId') documentId: string,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    const file = await this.studentDocumentsService.getFileForView(studentId, documentId);
    await this.activityLog.log(admin.id, 'view_document', 'student_documents', documentId);
    return file;
  }

  @Delete(':documentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('studentId') studentId: string, @Param('documentId') documentId: string) {
    return this.studentDocumentsService.remove(studentId, documentId);
  }
}
