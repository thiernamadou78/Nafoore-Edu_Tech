import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { ContactsModule } from './contacts/contacts.module';
import { AuthModule } from './auth/auth.module';
import { ActivityLogModule } from './activity-log/activity-log.module';
import { AdminAccountsModule } from './admin-accounts/admin-accounts.module';
import { TeacherApplicationsModule } from './teacher-applications/teacher-applications.module';
import { LeadsModule } from './leads/leads.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { TeachersModule } from './teachers/teachers.module';
import { StudentsModule } from './students/students.module';
import { PhotosModule } from './photos/photos.module';
import { EmailModule } from './email/email.module';
import { OnboardingModule } from './onboarding/onboarding.module';

@Module({
  imports: [
    PrismaModule,
    ContactsModule,
    AuthModule,
    ActivityLogModule,
    EmailModule,
    OnboardingModule,
    AdminAccountsModule,
    TeacherApplicationsModule,
    LeadsModule,
    DashboardModule,
    PhotosModule,
    TeachersModule,
    StudentsModule,
  ],
})
export class AppModule {}
