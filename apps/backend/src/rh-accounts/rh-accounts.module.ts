import { Module } from '@nestjs/common';
import { RhAccountsService } from './rh-accounts.service';

@Module({
  providers: [RhAccountsService],
  exports: [RhAccountsService],
})
export class RhAccountsModule {}
