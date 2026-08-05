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
import { CreateDocumentDto } from './dto/create-document.dto';
import { StudentDocumentsService } from './student-documents.service';

@Roles('super_admin', 'admin')
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Controller('students/:studentId/documents')
export class StudentDocumentsController {
  constructor(private readonly studentDocumentsService: StudentDocumentsService) {}

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

  @Get(':documentId/download')
  getDownloadUrl(
    @Param('studentId') studentId: string,
    @Param('documentId') documentId: string,
  ) {
    return this.studentDocumentsService.getDownloadUrl(studentId, documentId);
  }

  @Delete(':documentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('studentId') studentId: string, @Param('documentId') documentId: string) {
    return this.studentDocumentsService.remove(studentId, documentId);
  }
}
