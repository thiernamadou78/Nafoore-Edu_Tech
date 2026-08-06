import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PORTAL_ROLES_KEY } from './portal-roles.decorator';
import { AuthenticatedPortalAccount } from './portal-auth.guard';

@Injectable()
export class PortalRolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      PORTAL_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const portalAccount: AuthenticatedPortalAccount | undefined =
      request.portalAccount;

    if (!portalAccount || !requiredRoles.includes(portalAccount.role)) {
      throw new ForbiddenException('Rôle insuffisant pour cette action');
    }

    return true;
  }
}
