import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AdminModule, hasPermission, PERMISSION_KEY } from './permissions';
import { ROLES_KEY } from './roles.decorator';
import { AuthenticatedAdmin } from './supabase-auth.guard';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];
    const request = context.switchToHttp().getRequest();
    const adminAccount: AuthenticatedAdmin | undefined = request.adminAccount;

    // Droits par module (@Permission) : GET = consulter, le reste = modifier.
    const module = this.reflector.getAllAndOverride<AdminModule | undefined>(
      PERMISSION_KEY,
      targets,
    );
    if (module) {
      const level = request.method === 'GET' ? 'view' : 'edit';
      if (adminAccount && hasPermission(adminAccount, module, level)) return true;
      throw new ForbiddenException(
        level === 'edit' && adminAccount && hasPermission(adminAccount, module, 'view')
          ? 'Vous avez un accès en consultation seule sur cette rubrique'
          : "Vous n'avez pas accès à cette rubrique",
      );
    }

    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, targets);
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const hasRole = adminAccount?.roleNames.some((role) => requiredRoles.includes(role));
    if (!hasRole) {
      throw new ForbiddenException('Rôle insuffisant pour cette action');
    }

    return true;
  }
}
