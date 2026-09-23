import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
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
import { FamilyModule } from './family/family.module';
import { TeacherRequestsModule } from './teacher-requests/teacher-requests.module';
import { RenewalsModule } from './renewals/renewals.module';
import { GradesModule } from './grades/grades.module';
import { TeacherApplicationsPublicModule } from './teacher-applications-public/teacher-applications-public.module';
import { TeacherModule } from './teacher/teacher.module';
import { AdminMessagingModule } from './admin-messaging/admin-messaging.module';
import { EnterprisesModule } from './enterprises/enterprises.module';
import { FormulasModule } from './formulas/formulas.module';
import { ContractsModule } from './contracts/contracts.module';
import { RhAccountsModule } from './rh-accounts/rh-accounts.module';
import { AttendanceModule } from './attendance/attendance.module';
import { PushModule } from './push/push.module';
import { GeocodingModule } from './geocoding/geocoding.module';
import { SettingsModule } from './settings/settings.module';
import { TestimonialsModule } from './testimonials/testimonials.module';

@Module({
  imports: [
    // Limite par adresse IP. Large par defaut (les portails se rafraichissent
    // tout seuls toutes les 30 s) ; les formulaires publics ont des limites
    // beaucoup plus strictes, posees directement sur leurs routes.
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'default', ttl: 60_000, limit: 300 }],
      errorMessage: 'Trop de tentatives. Merci de réessayer un peu plus tard.',
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    ContactsModule,
    AuthModule,
    ActivityLogModule,
    EmailModule,
    OnboardingModule,
    AdminAccountsModule,
    TeacherApplicationsModule,
    TeacherApplicationsPublicModule,
    LeadsModule,
    DashboardModule,
    PhotosModule,
    TeachersModule,
    StudentsModule,
    FamilyModule,
    TeacherRequestsModule,
    RenewalsModule,
    GradesModule,
    TeacherModule,
    AdminMessagingModule,
    FormulasModule,
    ContractsModule,
    RhAccountsModule,
    EnterprisesModule,
    AttendanceModule,
    PushModule,
    GeocodingModule,
    SettingsModule,
    TestimonialsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
