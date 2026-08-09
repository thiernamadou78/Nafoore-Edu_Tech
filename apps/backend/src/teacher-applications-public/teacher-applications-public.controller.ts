import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CreatePublicTeacherApplicationDto } from './dto/create-public-teacher-application.dto';
import {
  TeacherApplicationsPublicService,
  TeacherApplicationUploadedFiles,
} from './teacher-applications-public.service';
import { documentFileFilter, MAX_FILE_SIZE_BYTES } from './upload.constants';

@Controller('teacher-applications/public')
export class TeacherApplicationsPublicController {
  constructor(private readonly service: TeacherApplicationsPublicService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'diplomas', maxCount: 3 },
        { name: 'criminalRecord', maxCount: 1 },
      ],
      {
        storage: memoryStorage(),
        limits: { fileSize: MAX_FILE_SIZE_BYTES },
        fileFilter: documentFileFilter,
      },
    ),
  )
  create(
    @Body() dto: CreatePublicTeacherApplicationDto,
    @UploadedFiles() files: TeacherApplicationUploadedFiles,
  ) {
    return this.service.create(dto, files ?? {});
  }
}
