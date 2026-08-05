import { Global, Module } from '@nestjs/common';
import { SupabaseAdminService } from './supabase-admin.service';
import { SupabaseAuthGuard } from './supabase-auth.guard';
import { RolesGuard } from './roles.guard';

@Global()
@Module({
  providers: [SupabaseAdminService, SupabaseAuthGuard, RolesGuard],
  exports: [SupabaseAdminService, SupabaseAuthGuard, RolesGuard],
})
export class AuthModule {}
