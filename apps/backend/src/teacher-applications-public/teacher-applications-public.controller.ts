import { Throttle } from '@nestjs/throttler';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CreatePublicTeacherApplicationDto } from './dto/create-public-teacher-application.dto';
import { UpdateCompletionProfileDto } from './dto/update-completion-profile.dto';
import {
  TeacherApplicationsPublicService,
  TeacherApplicationUploadedFiles,
} from './teacher-applications-public.service';
import { documentFileFilter, MAX_FILE_SIZE_BYTES } from './upload.constants';

@Controller('teacher-applications/public')
export class TeacherApplicationsPublicController {
  constructor(private readonly service: TeacherApplicationsPublicService) {}

  // Candidature publique : 5 envois par heure et par IP.
  @Throttle({ default: { limit: 5, ttl: 3_600_000 } })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'cv', maxCount: 1 },
        { name: 'identityDocument', maxCount: 1 },
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

  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Get(':token')
  getByToken(@Param('token') token: string) {
    return this.service.getByToken(token);
  }

  @Throttle({ default: { limit: 20, ttl: 3_600_000 } })
  @Patch(':token/profile')
  updateProfile(@Param('token') token: string, @Body() dto: UpdateCompletionProfileDto) {
    return this.service.updateProfile(token, dto);
  }

  @Throttle({ default: { limit: 20, ttl: 3_600_000 } })
  @Post(':token/documents')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'cv', maxCount: 1 },
        { name: 'identityDocument', maxCount: 1 },
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
  addDocuments(
    @Param('token') token: string,
    @UploadedFiles() files: TeacherApplicationUploadedFiles,
  ) {
    return this.service.addDocuments(token, files ?? {});
  }
}
