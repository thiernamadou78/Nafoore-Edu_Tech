import { Module } from '@nestjs/common';
import { ContractExpiryService } from './contract-expiry.service';
import { ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';

@Module({
  controllers: [ContractsController],
  providers: [ContractsService, ContractExpiryService],
  exports: [ContractsService],
})
export class ContractsModule {}
