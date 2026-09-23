import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { AuthEmailsService } from '../auth-emails/auth-emails.service';
import { CreateAdminAccountDto } from './dto/create-admin-account.dto';

@Injectable()
export class AdminAccountsService {
  private readonly logger = new Logger(AdminAccountsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLog: ActivityLogService,
    private readonly authEmails: AuthEmailsService,
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
    // L'email d'invitation est envoye par nous (charte Nafoore), pas par
    // Supabase — voir AuthEmailsService.
    const invitation = await this.authEmails.createInvitedUser(dto.email);
    const roles = await this.prisma.role.findMany({
      where: { name: { in: dto.roles } },
    });

    const account = await this.prisma.$transaction(async (tx) => {
      await tx.adminAccount.create({
        data: {
          id: invitation.userId,
          email: dto.email,
          name: dto.name,
        },
      });
      await tx.adminAccountRole.createMany({
        data: roles.map((role) => ({
          adminAccountId: invitation.userId,
          roleId: role.id,
        })),
      });
      return tx.adminAccount.findUniqueOrThrow({
        where: { id: invitation.userId },
        include: { roles: { include: { role: true } } },
      });
    });

    await this.activityLog.log(
      actorId,
      'create_admin_account',
      'admin_accounts',
      account.id,
    );

    try {
      await this.authEmails.sendAdminInvitation(dto.email, dto.name, invitation.link);
    } catch (error) {
      this.logger.error(
        `Échec d'envoi de l'invitation à ${dto.email}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new BadRequestException(
        "Compte créé, mais l'email d'invitation n'a pas pu être envoyé. Utilisez « Renvoyer l'invitation ».",
      );
    }

    return this.toDto(account);
  }

  async resendInvitation(id: string, actorId: string) {
    const account = await this.prisma.adminAccount.findUniqueOrThrow({ where: { id } });
    await this.authEmails.resendAdminInvitation(account.email, account.name);
    await this.activityLog.log(actorId, 'resend_admin_invitation', 'admin_accounts', id);
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
