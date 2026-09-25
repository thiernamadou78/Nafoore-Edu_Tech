import { Global, Module } from '@nestjs/common';
import { SessionChangesService } from './session-changes.service';

@Global()
@Module({
  providers: [SessionChangesService],
  exports: [SessionChangesService],
})
export class SessionChangesModule {}
