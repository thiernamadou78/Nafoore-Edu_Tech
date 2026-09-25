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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CurrentPortalAccount } from '../auth/current-portal-account.decorator';
import { AuthenticatedPortalAccount, PortalAuthGuard } from '../auth/portal-auth.guard';
import { PortalRoles } from '../auth/portal-roles.decorator';
import { PortalRolesGuard } from '../auth/portal-roles.guard';
import { CreateFamilyStudentDto } from './dto/create-family-student.dto';
import { UpdateFamilyStudentDto } from './dto/update-family-student.dto';
import { SetFamilyNameDto } from './dto/set-family-name.dto';
import { StartThreadDto } from './dto/start-thread.dto';
import { SendFamilyMessageDto } from './dto/send-family-message.dto';
import { FamilyService } from './family.service';
import { SessionChangesService } from '../session-changes/session-changes.service';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

class PostponeSessionDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

class CancelSessionDto {
  @IsString()
  @MinLength(2, { message: "Indiquez le motif de l'annulation" })
  @MaxLength(500)
  reason: string;
}

@PortalRoles('famille')
@UseGuards(PortalAuthGuard, PortalRolesGuard)
@Controller('family')
export class FamilyController {
  constructor(
    private readonly familyService: FamilyService,
    private readonly sessionChanges: SessionChangesService,
  ) {}

  @Get('me')
  me(@CurrentPortalAccount() portalAccount: AuthenticatedPortalAccount) {
    return this.familyService.me(portalAccount);
  }

  @Patch('me/password-changed')
  async passwordChanged(
    @CurrentPortalAccount() portalAccount: AuthenticatedPortalAccount,
  ) {
    await this.familyService.markPasswordChanged(portalAccount.id);
    return { mustChangePassword: false };
  }

  @Patch('me/family-name')
  async setFamilyName(
    @Body() dto: SetFamilyNameDto,
    @CurrentPortalAccount() portalAccount: AuthenticatedPortalAccount,
  ) {
    await this.familyService.setFamilyName(portalAccount.id, dto);
    return { familyName: dto.familyName };
  }

  @Get('students')
  listStudents(
    @CurrentPortalAccount() portalAccount: AuthenticatedPortalAccount,
  ) {
    return this.familyService.listMyStudents(portalAccount);
  }

  @Post('students')
  createStudent(
    @Body() dto: CreateFamilyStudentDto,
    @CurrentPortalAccount() portalAccount: AuthenticatedPortalAccount,
  ) {
    return this.familyService.createStudent(portalAccount, dto);
  }

  @Get('students/:id')
  getStudent(
    @Param('id') id: string,
    @CurrentPortalAccount() portalAccount: AuthenticatedPortalAccount,
  ) {
    return this.familyService.getStudent(portalAccount, id);
  }

  @Patch('students/:id')
  updateStudent(
    @Param('id') id: string,
    @Body() dto: UpdateFamilyStudentDto,
    @CurrentPortalAccount() portalAccount: AuthenticatedPortalAccount,
  ) {
    return this.familyService.updateStudent(portalAccount, id, dto);
  }

  @Post('students/:id/photo')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  uploadStudentPhoto(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentPortalAccount() portalAccount: AuthenticatedPortalAccount,
  ) {
    return this.familyService.uploadStudentPhoto(portalAccount, id, file);
  }

  @Delete('students/:id/photo')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeStudentPhoto(
    @Param('id') id: string,
    @CurrentPortalAccount() portalAccount: AuthenticatedPortalAccount,
  ) {
    return this.familyService.removeStudentPhoto(portalAccount, id);
  }

  // Decaler : la seance passe "a replanifier", l'enseignant choisira le
  // nouveau creneau (la famille l'a generalement appele avant).
  @Post('sessions/:id/postpone')
  postponeSession(
    @CurrentPortalAccount() portalAccount: AuthenticatedPortalAccount,
    @Param('id') id: string,
    @Body() dto: PostponeSessionDto,
  ) {
    return this.sessionChanges.postponeByFamily(portalAccount, id, dto.reason);
  }

  @Post('sessions/:id/cancel')
  cancelSession(
    @CurrentPortalAccount() portalAccount: AuthenticatedPortalAccount,
    @Param('id') id: string,
    @Body() dto: CancelSessionDto,
  ) {
    return this.sessionChanges.cancelByFamily(portalAccount, id, dto.reason);
  }

  @Get('hours')
  hours(@CurrentPortalAccount() portalAccount: AuthenticatedPortalAccount) {
    return this.familyService.getHours(portalAccount);
  }

  @Get('teachers')
  listTeachers(@CurrentPortalAccount() portalAccount: AuthenticatedPortalAccount) {
    return this.familyService.listMyTeachers(portalAccount);
  }

  @Get('messages')
  listMessageThreads(@CurrentPortalAccount() portalAccount: AuthenticatedPortalAccount) {
    return this.familyService.listMyMessageThreads(portalAccount);
  }

  @Post('messages')
  startThread(
    @Body() dto: StartThreadDto,
    @CurrentPortalAccount() portalAccount: AuthenticatedPortalAccount,
  ) {
    return this.familyService.startOrGetThread(portalAccount, dto);
  }

  @Post('messages/:threadId')
  sendMessage(
    @Param('threadId') threadId: string,
    @Body() dto: SendFamilyMessageDto,
    @CurrentPortalAccount() portalAccount: AuthenticatedPortalAccount,
  ) {
    return this.familyService.sendMessage(portalAccount, threadId, dto);
  }

  @Post('messages/:threadId/read')
  markThreadRead(
    @Param('threadId') threadId: string,
    @CurrentPortalAccount() portalAccount: AuthenticatedPortalAccount,
  ) {
    return this.familyService.markThreadRead(portalAccount, threadId);
  }

  @Get('messages/unread-count')
  getUnreadMessageCount(@CurrentPortalAccount() portalAccount: AuthenticatedPortalAccount) {
    return this.familyService.getUnreadMessageCount(portalAccount);
  }
}
