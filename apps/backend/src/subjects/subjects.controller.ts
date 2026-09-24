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
  UseGuards,
} from '@nestjs/common';
import { IsBoolean, IsIn, IsOptional, IsString, Length } from 'class-validator';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { SUBJECT_CATEGORIES, SubjectCategory, SubjectsService } from './subjects.service';

class CreateSubjectDto {
  @IsString()
  @Length(2, 80, { message: 'Le nom doit faire entre 2 et 80 caractères' })
  name: string;

  @IsIn(SUBJECT_CATEGORIES, { message: 'Catégorie inconnue' })
  category: SubjectCategory;
}

class UpdateSubjectDto {
  @IsOptional()
  @IsIn(SUBJECT_CATEGORIES, { message: 'Catégorie inconnue' })
  category?: SubjectCategory;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// Public : listes de choix (formulaire de candidature, profils…).
@Controller('subjects')
export class SubjectsController {
  constructor(private readonly subjects: SubjectsService) {}

  @Get()
  list() {
    return this.subjects.listActive();
  }
}

// Gestion du catalogue : Super Admin uniquement.
@Roles('super_admin')
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Controller('admin/subjects')
export class AdminSubjectsController {
  constructor(private readonly subjects: SubjectsService) {}

  @Get()
  list() {
    return this.subjects.listAll();
  }

  @Post()
  create(@Body() dto: CreateSubjectDto) {
    return this.subjects.create(dto.name, dto.category);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSubjectDto) {
    return this.subjects.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.subjects.remove(id);
  }
}
