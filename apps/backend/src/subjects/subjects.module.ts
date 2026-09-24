import { Global, Module } from '@nestjs/common';
import { AdminSubjectsController, SubjectsController } from './subjects.controller';
import { SubjectsService } from './subjects.service';

@Global()
@Module({
  controllers: [SubjectsController, AdminSubjectsController],
  providers: [SubjectsService],
  exports: [SubjectsService],
})
export class SubjectsModule {}
