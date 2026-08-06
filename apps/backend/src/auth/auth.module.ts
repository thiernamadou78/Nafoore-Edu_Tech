import { Global, Module } from '@nestjs/common';
import { SupabaseAdminService } from './supabase-admin.service';
import { SupabaseAuthGuard } from './supabase-auth.guard';
import { RolesGuard } from './roles.guard';
import { PortalAuthGuard } from './portal-auth.guard';
import { PortalRolesGuard } from './portal-roles.guard';

@Global()
@Module({
  providers: [
    SupabaseAdminService,
    SupabaseAuthGuard,
    RolesGuard,
    PortalAuthGuard,
    PortalRolesGuard,
  ],
  exports: [
    SupabaseAdminService,
    SupabaseAuthGuard,
    RolesGuard,
    PortalAuthGuard,
    PortalRolesGuard,
  ],
})
export class AuthModule {}
