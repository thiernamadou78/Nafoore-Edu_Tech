import { SetMetadata } from '@nestjs/common';

// Modules de l'admin sur lesquels le Super Admin accorde des droits.
// Chaque droit s'ecrit "<module>:view" (consulter) ou "<module>:edit"
// (modifier, implique consulter).
export const ADMIN_MODULES = [
  'dashboard',
  'leads',
  'students',
  'teachers',
  'recruitment',
  'teacher_requests',
  'renewals',
  'messaging',
  'support',
  'attendance',
  'enterprises',
  'formulas',
  'site',
] as const;
export type AdminModule = (typeof ADMIN_MODULES)[number];
export type PermissionLevel = 'view' | 'edit';

export const ALL_PERMISSIONS = ADMIN_MODULES.flatMap((module) => [
  `${module}:view`,
  `${module}:edit`,
]);

export const PERMISSION_KEY = 'permission';

// Protege un controleur ou une route par module : GET = "view", toute autre
// methode HTTP = "edit". Le Super Admin passe toujours.
export const Permission = (module: AdminModule) => SetMetadata(PERMISSION_KEY, module);

// Garde les seuls droits connus, et ajoute "view" quand "edit" est coche.
export function normalizePermissions(permissions: string[]): string[] {
  const set = new Set(permissions.filter((p) => ALL_PERMISSIONS.includes(p)));
  for (const module of ADMIN_MODULES) {
    if (set.has(`${module}:edit`)) set.add(`${module}:view`);
  }
  return ALL_PERMISSIONS.filter((p) => set.has(p));
}

export function hasPermission(
  admin: { roleNames: string[]; permissions: string[] },
  module: AdminModule,
  level: PermissionLevel = 'view',
): boolean {
  return admin.roleNames.includes('super_admin') || admin.permissions.includes(`${module}:${level}`);
}
