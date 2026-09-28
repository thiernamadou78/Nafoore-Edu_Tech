import { Module } from '@nestjs/common';
import { LegalAcceptancesController } from './legal.controller';

@Module({
  controllers: [LegalAcceptancesController],
})
export class LegalModule {}
