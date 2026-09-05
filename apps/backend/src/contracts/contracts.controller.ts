import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { CurrentAdmin } from '../auth/current-admin.decorator';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AuthenticatedAdmin, SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { ContractsService } from './contracts.service';
import { UpdateContractDto } from './dto/update-contract.dto';

@Roles('super_admin', 'admin')
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Controller('contracts')
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateContractDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.contractsService.update(id, dto, admin.id);
  }

  @Get(':id/amendments')
  listAmendments(@Param('id') id: string) {
    return this.contractsService.listAmendments(id);
  }
}
