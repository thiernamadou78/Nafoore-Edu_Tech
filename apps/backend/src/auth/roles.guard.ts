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
import { ZONE_PARAMS_KEY, ZoneKind, ZoneService } from './zone.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly zone: ZoneService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!this.checkAccess(context)) return false;

    // Zone du delegue : l'element vise par l'URL doit etre dans sa zone.
    const zoneParams = this.reflector.getAllAndOverride<Record<string, ZoneKind> | undefined>(
      ZONE_PARAMS_KEY,
      [context.getHandler(), context.getClass()],
    );
    const request = context.switchToHttp().getRequest();
    if (zoneParams && request.adminAccount) {
      for (const [param, kind] of Object.entries(zoneParams)) {
        const id = request.params?.[param];
        if (id) await this.zone.assertVisible(request.adminAccount, kind, id);
      }
    }
    return true;
  }

  private checkAccess(context: ExecutionContext): boolean {
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
