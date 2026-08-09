import { Global, Module } from '@nestjs/common';
import { SupabaseAdminService } from './supabase-admin.service';
import { SupabaseJwtService } from './supabase-jwt.service';
import { SupabaseAuthGuard } from './supabase-auth.guard';
import { RolesGuard } from './roles.guard';
import { PortalAuthGuard } from './portal-auth.guard';
import { PortalRolesGuard } from './portal-roles.guard';
import { TeacherAuthGuard } from './teacher-auth.guard';

@Global()
@Module({
  providers: [
    SupabaseAdminService,
    SupabaseJwtService,
    SupabaseAuthGuard,
    RolesGuard,
    PortalAuthGuard,
    PortalRolesGuard,
    TeacherAuthGuard,
  ],
  exports: [
    SupabaseAdminService,
    SupabaseJwtService,
    SupabaseAuthGuard,
    RolesGuard,
    PortalAuthGuard,
    PortalRolesGuard,
    TeacherAuthGuard,
  ],
})
export class AuthModule {}
