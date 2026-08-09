import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PortalAccount } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseJwtService } from './supabase-jwt.service';

export type AuthenticatedPortalAccount = PortalAccount;

@Injectable()
export class PortalAuthGuard implements CanActivate {
  constructor(
    private readonly supabaseJwt: SupabaseJwtService,
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

    const user = await this.supabaseJwt.verify(token);

    const portalAccount = await this.prisma.portalAccount.findUnique({
      where: { id: user.id },
    });

    if (!portalAccount || portalAccount.status === 'suspendu') {
      throw new UnauthorizedException('Compte introuvable ou suspendu');
    }

    request.portalAccount = portalAccount;

    return true;
  }
}
