import { Module } from '@nestjs/common';
import { TeacherApplicationsPublicController } from './teacher-applications-public.controller';
import { TeacherApplicationsPublicService } from './teacher-applications-public.service';

@Module({
  controllers: [TeacherApplicationsPublicController],
  providers: [TeacherApplicationsPublicService],
})
export class TeacherApplicationsPublicModule {}
