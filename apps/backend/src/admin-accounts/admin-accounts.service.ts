import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { SupabaseAdminService } from '../auth/supabase-admin.service';
import { CreateAdminAccountDto } from './dto/create-admin-account.dto';
import { resolvePortalUrl } from '../email/portal-url.util';

@Injectable()
export class AdminAccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLog: ActivityLogService,
    private readonly supabaseAdmin: SupabaseAdminService,
  ) {}

  list() {
    return this.prisma.adminAccount
      .findMany({
        include: { roles: { include: { role: true } } },
        orderBy: { createdAt: 'desc' },
      })
      .then((accounts) => accounts.map(this.toDto));
  }

  async create(dto: CreateAdminAccountDto, actorId: string) {
    const { data, error } =
      await this.supabaseAdmin.client.auth.admin.inviteUserByEmail(dto.email, {
        // Sans redirectTo, Supabase renvoie vers son "Site URL" par defaut
        // (localhost:3000) : l'invite doit arriver sur la page de l'admin qui
        // lui fait choisir son mot de passe.
        redirectTo: `${resolvePortalUrl('admin')}/reinitialiser-mot-de-passe`,
      });
    if (error || !data.user) {
      throw error ?? new Error("Échec de l'invitation Supabase Auth");
    }

    const roles = await this.prisma.role.findMany({
      where: { name: { in: dto.roles } },
    });

    const account = await this.prisma.$transaction(async (tx) => {
      await tx.adminAccount.create({
        data: {
          id: data.user.id,
          email: dto.email,
          name: dto.name,
        },
      });
      await tx.adminAccountRole.createMany({
        data: roles.map((role) => ({
          adminAccountId: data.user.id,
          roleId: role.id,
        })),
      });
      return tx.adminAccount.findUniqueOrThrow({
        where: { id: data.user.id },
        include: { roles: { include: { role: true } } },
      });
    });

    await this.activityLog.log(
      actorId,
      'create_admin_account',
      'admin_accounts',
      account.id,
    );

    return this.toDto(account);
  }

  async updateRoles(id: string, roleNames: string[], actorId: string) {
    const roles = await this.prisma.role.findMany({
      where: { name: { in: roleNames } },
    });

    const account = await this.prisma.$transaction(async (tx) => {
      await tx.adminAccountRole.deleteMany({ where: { adminAccountId: id } });
      await tx.adminAccountRole.createMany({
        data: roles.map((role) => ({ adminAccountId: id, roleId: role.id })),
      });
      return tx.adminAccount.findUniqueOrThrow({
        where: { id },
        include: { roles: { include: { role: true } } },
      });
    });

    await this.activityLog.log(
      actorId,
      'update_admin_account_roles',
      'admin_accounts',
      id,
    );

    return this.toDto(account);
  }

  async updateActive(id: string, isActive: boolean, actorId: string) {
    const account = await this.prisma.adminAccount.update({
      where: { id },
      data: { isActive },
      include: { roles: { include: { role: true } } },
    });

    await this.activityLog.log(
      actorId,
      isActive ? 'reactivate_admin_account' : 'suspend_admin_account',
      'admin_accounts',
      id,
    );

    return this.toDto(account);
  }

  private toDto(account: {
    id: string;
    email: string;
    name: string;
    isActive: boolean;
    createdAt: Date;
    roles: { role: { name: string } }[];
  }) {
    return {
      id: account.id,
      email: account.email,
      name: account.name,
      isActive: account.isActive,
      createdAt: account.createdAt,
      roles: account.roles.map((r) => r.role.name),
    };
  }
}
