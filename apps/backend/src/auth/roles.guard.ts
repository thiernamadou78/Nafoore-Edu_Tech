import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';
import { AuthenticatedAdmin } from './supabase-auth.guard';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const adminAccount: AuthenticatedAdmin | undefined = request.adminAccount;
    const hasRole = adminAccount?.roleNames.some((role) =>
      requiredRoles.includes(role),
    );

    if (!hasRole) {
      throw new ForbiddenException('Rôle insuffisant pour cette action');
    }

    return true;
  }
}
