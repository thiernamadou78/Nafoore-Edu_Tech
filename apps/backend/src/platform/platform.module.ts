import { Module } from '@nestjs/common';
import { TeacherModule } from '../teacher/teacher.module';
import { PlatformTimezoneService } from '../settings/platform-timezone.service';
import { PlatformController } from './platform.controller';

@Module({
  imports: [TeacherModule],
  controllers: [PlatformController],
  providers: [PlatformTimezoneService],
})
export class PlatformModule {}
