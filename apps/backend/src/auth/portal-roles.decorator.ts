import { SetMetadata } from '@nestjs/common';

export const PORTAL_ROLES_KEY = 'portalRoles';
export const PortalRoles = (...roles: string[]) =>
  SetMetadata(PORTAL_ROLES_KEY, roles);
