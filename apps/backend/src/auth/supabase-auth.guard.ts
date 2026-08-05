import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AdminAccount } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseAdminService } from './supabase-admin.service';

export type AuthenticatedAdmin = AdminAccount & { roleNames: string[] };

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(
    private readonly supabaseAdmin: SupabaseAdminService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined = request.headers['authorization'];
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : undefined;

    if (!token) {
      throw new UnauthorizedException('Token manquant');
    }

    const { data, error } = await this.supabaseAdmin.client.auth.getUser(
      token,
    );
    if (error || !data.user) {
      throw new UnauthorizedException('Token invalide');
    }

    const adminAccount = await this.prisma.adminAccount.findUnique({
      where: { id: data.user.id },
      include: { roles: { include: { role: true } } },
    });

    if (!adminAccount || !adminAccount.isActive) {
      throw new UnauthorizedException('Compte admin introuvable ou désactivé');
    }

    const authenticatedAdmin: AuthenticatedAdmin = {
      id: adminAccount.id,
      email: adminAccount.email,
      name: adminAccount.name,
      isActive: adminAccount.isActive,
      createdAt: adminAccount.createdAt,
      roleNames: adminAccount.roles.map((r) => r.role.name),
    };

    request.adminAccount = authenticatedAdmin;

    return true;
  }
}
