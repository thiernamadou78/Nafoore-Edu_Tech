import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Permission } from '../auth/permissions';
import { RolesGuard } from '../auth/roles.guard';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { CreateFormulaDto } from './dto/create-formula.dto';
import { UpdateFormulaDto } from './dto/update-formula.dto';
import { FormulasService } from './formulas.service';

@Permission('formulas')
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Controller('formulas')
export class FormulasController {
  constructor(private readonly formulasService: FormulasService) {}

  @Get()
  list() {
    return this.formulasService.list();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.formulasService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateFormulaDto) {
    return this.formulasService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateFormulaDto) {
    return this.formulasService.update(id, dto);
  }
}
