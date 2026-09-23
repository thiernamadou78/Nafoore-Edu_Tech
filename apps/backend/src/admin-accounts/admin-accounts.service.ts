import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { AuthEmailsService } from '../auth-emails/auth-emails.service';
import { SupabaseAdminService } from '../auth/supabase-admin.service';
import { GeocodingService } from '../geocoding/geocoding.service';
import { normalizePermissions } from '../auth/permissions';
import { AdminAccountSettingsDto, CreateAdminAccountDto } from './dto/create-admin-account.dto';
import { UpdateAdminAccountDto } from './dto/update-admin-account.dto';

const WITH_ROLES = { roles: { include: { role: true } } } as const;
type AccountWithRoles = Prisma.AdminAccountGetPayload<{ include: typeof WITH_ROLES }>;

@Injectable()
export class AdminAccountsService {
  private readonly logger = new Logger(AdminAccountsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLog: ActivityLogService,
    private readonly authEmails: AuthEmailsService,
    private readonly supabaseAdmin: SupabaseAdminService,
    private readonly geocoding: GeocodingService,
  ) {}

  list() {
    return this.prisma.adminAccount
      .findMany({ include: WITH_ROLES, orderBy: { createdAt: 'desc' } })
      .then((accounts) => accounts.map((account) => this.toDto(account)));
  }

  // Traduit le formulaire (type de compte, droits, zone) en colonnes. Un
  // Super Admin a tous les droits sur toutes les zones : on ne stocke rien.
  private async resolveSettings(dto: AdminAccountSettingsDto) {
    if (dto.role === 'super_admin') {
      return {
        roleName: dto.role,
        data: {
          permissions: [],
          zoneAddress: null,
          zoneLatitude: null,
          zoneLongitude: null,
          zoneRadiusKm: null,
        },
      };
    }

    const permissions = normalizePermissions(dto.permissions);
    if (permissions.length === 0) {
      throw new BadRequestException('Cochez au moins un droit pour ce compte');
    }

    const zoneAddress = dto.zoneAddress?.trim() || null;
    if (!zoneAddress) {
      return {
        roleName: dto.role,
        data: {
          permissions,
          zoneAddress: null,
          zoneLatitude: null,
          zoneLongitude: null,
          zoneRadiusKm: null,
        },
      };
    }
    if (!dto.zoneRadiusKm) {
      throw new BadRequestException('Indiquez le rayon de la zone (en km)');
    }
    const coords = await this.geocoding.geocode(zoneAddress, null, { worldwide: true });
    if (!coords) {
      throw new BadRequestException(
        "Adresse de la zone introuvable sur la carte. Précisez-la (ville, pays…).",
      );
    }
    return {
      roleName: dto.role,
      data: {
        permissions,
        zoneAddress,
        zoneLatitude: coords.latitude,
        zoneLongitude: coords.longitude,
        zoneRadiusKm: dto.zoneRadiusKm,
      },
    };
  }

  private async roleId(name: string) {
    const role = await this.prisma.role.findUnique({ where: { name } });
    if (!role) throw new BadRequestException(`Rôle inconnu : ${name}`);
    return role.id;
  }

  // Il doit toujours rester au moins un Super Admin actif, sinon plus
  // personne ne peut gerer les comptes.
  private async assertNotLastSuperAdmin(id: string) {
    const otherSuperAdmins = await this.prisma.adminAccount.count({
      where: {
        id: { not: id },
        isActive: true,
        roles: { some: { role: { name: 'super_admin' } } },
      },
    });
    if (otherSuperAdmins === 0) {
      throw new BadRequestException(
        "C'est le dernier Super Admin actif : nommez d'abord un autre Super Admin.",
      );
    }
  }

  private async findAccount(id: string) {
    const account = await this.prisma.adminAccount.findUnique({ where: { id }, include: WITH_ROLES });
    if (!account) throw new NotFoundException('Compte introuvable');
    return account;
  }

  async create(dto: CreateAdminAccountDto, actorId: string) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.adminAccount.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });
    if (existing) throw new BadRequestException('Un compte admin existe déjà avec cet email');

    // Tout ce qui peut echouer (adresse introuvable…) est verifie AVANT de
    // creer l'utilisateur Supabase, pour ne pas laisser de compte orphelin.
    const settings = await this.resolveSettings(dto);
    const roleId = await this.roleId(settings.roleName);

    // L'email d'invitation est envoye par nous (charte Nafoore), pas par
    // Supabase — voir AuthEmailsService.
    const invitation = await this.authEmails.createInvitedUser(email).catch((error) => {
      throw new BadRequestException(
        /already/i.test(error?.message ?? '')
          ? 'Cet email a déjà un compte sur la plateforme (famille ou enseignant) : utilisez une autre adresse.'
          : `Invitation impossible : ${error?.message ?? 'erreur inconnue'}`,
      );
    });

    let account: AccountWithRoles;
    try {
      account = await this.prisma.adminAccount.create({
        data: {
          id: invitation.userId,
          email,
          name: dto.name.trim(),
          ...settings.data,
          roles: { create: { roleId } },
        },
        include: WITH_ROLES,
      });
    } catch (error) {
      await this.supabaseAdmin.client.auth.admin.deleteUser(invitation.userId).catch(() => {});
      throw error;
    }

    await this.activityLog.log(actorId, 'create_admin_account', 'admin_accounts', account.id);

    try {
      await this.authEmails.sendAdminInvitation(email, account.name, invitation.link);
    } catch (error) {
      this.logger.error(
        `Échec d'envoi de l'invitation à ${email}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new BadRequestException(
        "Compte créé, mais l'email d'invitation n'a pas pu être envoyé. Utilisez « Renvoyer l'invitation ».",
      );
    }

    return this.toDto(account);
  }

  async update(id: string, dto: UpdateAdminAccountDto, actorId: string) {
    const current = await this.findAccount(id);
    const wasSuperAdmin = current.roles.some((r) => r.role.name === 'super_admin');
    if (wasSuperAdmin && dto.role !== 'super_admin') {
      await this.assertNotLastSuperAdmin(id);
    }

    const settings = await this.resolveSettings(dto);
    const roleId = await this.roleId(settings.roleName);

    const account = await this.prisma.$transaction(async (tx) => {
      await tx.adminAccountRole.deleteMany({ where: { adminAccountId: id } });
      return tx.adminAccount.update({
        where: { id },
        data: {
          name: dto.name.trim(),
          ...settings.data,
          roles: { create: { roleId } },
        },
        include: WITH_ROLES,
      });
    });

    await this.activityLog.log(actorId, 'update_admin_account', 'admin_accounts', id);
    return this.toDto(account);
  }

  async resendInvitation(id: string, actorId: string) {
    const account = await this.findAccount(id);
    await this.authEmails.resendAdminInvitation(account.email, account.name);
    await this.activityLog.log(actorId, 'resend_admin_invitation', 'admin_accounts', id);
  }

  async updateActive(id: string, isActive: boolean, actorId: string) {
    const current = await this.findAccount(id);
    if (!isActive) {
      if (id === actorId) {
        throw new BadRequestException('Vous ne pouvez pas suspendre votre propre compte');
      }
      if (current.roles.some((r) => r.role.name === 'super_admin')) {
        await this.assertNotLastSuperAdmin(id);
      }
    }

    const account = await this.prisma.adminAccount.update({
      where: { id },
      data: { isActive },
      include: WITH_ROLES,
    });

    await this.activityLog.log(
      actorId,
      isActive ? 'reactivate_admin_account' : 'suspend_admin_account',
      'admin_accounts',
      id,
    );

    return this.toDto(account);
  }

  toDto(account: Omit<AccountWithRoles, 'roles'> & { roles: { role: { name: string } }[] }) {
    const roles = account.roles.map((r) => r.role.name);
    return {
      id: account.id,
      email: account.email,
      name: account.name,
      isActive: account.isActive,
      createdAt: account.createdAt,
      role: roles.includes('super_admin') ? 'super_admin' : 'admin',
      roles,
      permissions: account.permissions,
      zoneAddress: account.zoneAddress,
      zoneLatitude: account.zoneLatitude,
      zoneLongitude: account.zoneLongitude,
      zoneRadiusKm: account.zoneRadiusKm,
    };
  }
}
