import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { SupabaseAdminService } from '../auth/supabase-admin.service';
import { EmailService } from '../email/email.service';
import { resolvePortalUrl } from '../email/portal-url.util';
import { renderWelcomeEmail } from '../email/templates/portal-welcome.template';
import { createAuthUserReclaimingOrphans } from '../onboarding/create-auth-user.util';
import { generateTemporaryPassword } from '../onboarding/password-generator.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRhOwnerDto } from './dto/create-rh-owner.dto';

@Injectable()
export class RhAccountsService {
  private readonly logger = new Logger(RhAccountsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLog: ActivityLogService,
    private readonly supabaseAdmin: SupabaseAdminService,
    private readonly emailService: EmailService,
  ) {}

  async listForEnterprise(enterpriseId: string) {
    await this.assertEnterpriseExists(enterpriseId);
    return this.prisma.rhAccount.findMany({
      where: { enterpriseId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createOwner(enterpriseId: string, dto: CreateRhOwnerDto, actorId: string) {
    await this.assertEnterpriseExists(enterpriseId);

    const existingEmail = await this.prisma.rhAccount.findUnique({
      where: { email: dto.email },
    });
    if (existingEmail) {
      throw new ConflictException(`Un compte RH existe déjà avec l'adresse ${dto.email}`);
    }

    const tempPassword = generateTemporaryPassword();

    let userId: string;
    try {
      userId = await createAuthUserReclaimingOrphans(
        this.supabaseAdmin,
        dto.email,
        tempPassword,
        (id) => this.prisma.rhAccount.findUnique({ where: { id } }).then((a) => !a),
      );
    } catch (error) {
      if ((error as Error)?.message?.toLowerCase().includes('already')) {
        throw new ConflictException(
          `Un compte existe déjà avec l'adresse ${dto.email}. Vérifie qu'il ne s'agit pas d'un doublon avant de continuer.`,
        );
      }
      throw error;
    }

    let rhAccount;
    try {
      rhAccount = await this.prisma.rhAccount.create({
        data: {
          id: userId,
          email: dto.email,
          fullName: dto.fullName,
          enterpriseId,
          role: 'owner',
          invitedByAdminId: actorId,
        },
      });
    } catch (creationError) {
      try {
        await this.supabaseAdmin.client.auth.admin.deleteUser(userId);
      } catch (cleanupError) {
        this.logger.error(
          `Échec du nettoyage du compte Supabase Auth orphelin ${userId} après échec de création`,
          cleanupError instanceof Error ? cleanupError.stack : undefined,
        );
      }
      throw creationError;
    }

    await this.dispatchCredentials({ rhAccount, tempPassword, actorId });

    await this.activityLog.log(actorId, 'create_rh_owner', 'rh_accounts', rhAccount.id);

    return rhAccount;
  }

  private async dispatchCredentials({
    rhAccount,
    tempPassword,
    actorId,
  }: {
    rhAccount: { id: string; email: string; fullName: string };
    tempPassword: string;
    actorId: string;
  }) {
    const html = renderWelcomeEmail({
      fullName: rhAccount.fullName,
      email: rhAccount.email,
      tempPassword,
      role: 'entreprise',
      portalUrl: resolvePortalUrl('entreprise'),
    });

    let deliveryStatus: 'envoye' | 'echec' = 'envoye';
    let emailProviderId: string | undefined;
    try {
      const result = await this.emailService.send({
        to: rhAccount.email,
        subject: 'Bienvenue sur Nafoore Education — vos identifiants de connexion',
        html,
      });
      emailProviderId = result.providerId;
    } catch (sendError) {
      deliveryStatus = 'echec';
      this.logger.error(
        `Échec d'envoi de l'email d'identifiants pour le compte RH ${rhAccount.id}`,
        sendError instanceof Error ? sendError.stack : undefined,
      );
    }

    await this.prisma.rhCredentialDispatchLog.create({
      data: {
        rhAccountId: rhAccount.id,
        sentById: actorId,
        deliveryStatus,
        emailProviderId,
      },
    });
  }

  private async assertEnterpriseExists(enterpriseId: string) {
    const enterprise = await this.prisma.enterprise.findUnique({ where: { id: enterpriseId } });
    if (!enterprise) {
      throw new NotFoundException('Entreprise introuvable');
    }
    return enterprise;
  }
}
