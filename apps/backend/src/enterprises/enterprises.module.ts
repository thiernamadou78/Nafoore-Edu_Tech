import { Module } from '@nestjs/common';
import { ContractsModule } from '../contracts/contracts.module';
import { ImportModule } from '../import/import.module';
import { RhAccountsModule } from '../rh-accounts/rh-accounts.module';
import { EnterprisesController } from './enterprises.controller';
import { EnterprisesService } from './enterprises.service';

@Module({
  imports: [ContractsModule, RhAccountsModule, ImportModule],
  controllers: [EnterprisesController],
  providers: [EnterprisesService],
})
export class EnterprisesModule {}
