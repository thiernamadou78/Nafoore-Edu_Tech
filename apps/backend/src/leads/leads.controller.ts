import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentAdmin } from '../auth/current-admin.decorator';
import { Permission } from '../auth/permissions';
import { RolesGuard } from '../auth/roles.guard';
import { AuthenticatedAdmin, SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { LeadOnboardingService } from '../onboarding/lead-onboarding.service';
import { ConvertToStudentDto } from './dto/convert-to-student.dto';
import { CreateFamilyLeadDto } from './dto/create-family-lead.dto';
import { CreateLeadNoteDto } from './dto/create-lead-note.dto';
import { ListLeadsQueryDto } from './dto/list-leads-query.dto';
import { UpdateLeadAddressDto } from './dto/update-lead-address.dto';
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto';
import { LeadsService } from './leads.service';

@Permission('leads')
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Controller('leads')
export class LeadsController {
  constructor(
    private readonly leadsService: LeadsService,
    private readonly onboarding: LeadOnboardingService,
  ) {}

  @Get()
  list(@Query() query: ListLeadsQueryDto) {
    return this.leadsService.list(query);
  }

  @Post()
  createFamily(
    @Body() dto: CreateFamilyLeadDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.leadsService.createFamilyByAdmin(dto, admin.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.leadsService.findOne(id);
  }

  @Post(':id/notes')
  addNote(
    @Param('id') id: string,
    @Body() dto: CreateLeadNoteDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.leadsService.addNote(id, dto, admin.id);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateLeadStatusDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.leadsService.updateStatus(id, dto, admin.id);
  }

  @Patch(':id/address')
  updateAddress(
    @Param('id') id: string,
    @Body() dto: UpdateLeadAddressDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.leadsService.updateAddress(id, dto, admin.id);
  }

  @Post(':id/convert-to-student')
  convertToStudent(
    @Param('id') id: string,
    @Body() dto: ConvertToStudentDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.leadsService.convertToStudent(id, dto, admin.id);
  }

  @Post(':id/validate')
  validate(
    @Param('id') id: string,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.onboarding.validateAndCreateAccount(id, admin.id);
  }

  @Post(':id/resend-credentials')
  resendCredentials(
    @Param('id') id: string,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.onboarding.resendCredentials(id, admin.id);
  }
}
