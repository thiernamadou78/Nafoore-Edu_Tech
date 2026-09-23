import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CurrentAdmin } from '../auth/current-admin.decorator';
import { Permission } from '../auth/permissions';
import { RolesGuard } from '../auth/roles.guard';
import { AuthenticatedAdmin, SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { ContractsService } from '../contracts/contracts.service';
import { CreateContractDto } from '../contracts/dto/create-contract.dto';
import { CommitImportDto } from '../import/dto/commit-import.dto';
import { PreviewImportDto } from '../import/dto/preview-import.dto';
import { ImportService } from '../import/import.service';
import { CreateRhOwnerDto } from '../rh-accounts/dto/create-rh-owner.dto';
import { RhAccountsService } from '../rh-accounts/rh-accounts.service';
import { CreateEnterpriseDto } from './dto/create-enterprise.dto';
import { ListEnterprisesQueryDto } from './dto/list-enterprises-query.dto';
import { UpdateEnterpriseDto } from './dto/update-enterprise.dto';
import { EnterprisesService } from './enterprises.service';

@Permission('enterprises')
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Controller('enterprises')
export class EnterprisesController {
  constructor(
    private readonly enterprisesService: EnterprisesService,
    private readonly contractsService: ContractsService,
    private readonly rhAccountsService: RhAccountsService,
    private readonly importService: ImportService,
  ) {}

  @Get()
  list(@Query() query: ListEnterprisesQueryDto) {
    return this.enterprisesService.list(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.enterprisesService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateEnterpriseDto) {
    return this.enterprisesService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEnterpriseDto) {
    return this.enterprisesService.update(id, dto);
  }

  @Post(':id/contracts')
  @HttpCode(HttpStatus.CREATED)
  createContract(
    @Param('id') id: string,
    @Body() dto: CreateContractDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.contractsService.createForEnterprise(id, dto, admin.id);
  }

  @Get(':id/rh-accounts')
  listRhAccounts(@Param('id') id: string) {
    return this.rhAccountsService.listForEnterprise(id);
  }

  @Post(':id/rh-accounts')
  @HttpCode(HttpStatus.CREATED)
  createRhOwner(
    @Param('id') id: string,
    @Body() dto: CreateRhOwnerDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.rhAccountsService.createOwner(id, dto, admin.id);
  }

  @Post(':id/import/preview')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  previewImport(
    @Param('id') id: string,
    @Body() dto: PreviewImportDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.importService.preview(id, dto, file);
  }

  @Post(':id/import/commit')
  @HttpCode(HttpStatus.CREATED)
  commitImport(
    @Param('id') id: string,
    @Body() dto: CommitImportDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.importService.commit(id, dto, admin.id);
  }

  @Get(':id/import/batches')
  listImportBatches(@Param('id') id: string) {
    return this.importService.listBatches(id);
  }
}
