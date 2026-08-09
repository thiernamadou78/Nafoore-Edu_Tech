import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { SupabaseAdminService } from '../auth/supabase-admin.service';
import { EmailService } from '../email/email.service';
import { renderWelcomeEmail } from '../email/templates/portal-welcome.template';
import { resolvePortalUrl } from '../email/portal-url.util';
import { generateTemporaryPassword } from './password-generator.util';

const VALIDATABLE_STATUSES = ['en_verification', 'valide'];

@Injectable()
export class LeadOnboardingService {
  private readonly logger = new Logger(LeadOnboardingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLog: ActivityLogService,
    private readonly supabaseAdmin: SupabaseAdminService,
    private readonly emailService: EmailService,
  ) {}

  async validateAndCreateAccount(leadId: string, actorId: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      include: { portalAccount: true },
    });
    if (!lead) {
      throw new NotFoundException('Lead introuvable');
    }
    if (!VALIDATABLE_STATUSES.includes(lead.status)) {
      throw new BadRequestException(
        `Le lead doit être au statut en_verification ou valide (actuel : ${lead.status})`,
      );
    }
    if (lead.portalAccount) {
      throw new ConflictException('Un compte existe déjà pour ce lead');
    }

    const tempPassword = generateTemporaryPassword();

    const { data, error } = await this.supabaseAdmin.client.auth.admin.createUser({
      email: lead.email,
      password: tempPassword,
      email_confirm: true,
    });
    if (error || !data.user) {
      if (error?.message?.toLowerCase().includes('already')) {
        throw new ConflictException(
          `Un compte existe déjà avec l'adresse ${lead.email}. Vérifie qu'il ne s'agit pas d'un doublon avant de continuer.`,
        );
      }
      throw error ?? new Error('Échec de la création du compte');
    }

    const userId = data.user.id;

    let portalAccount;
    try {
      portalAccount = await this.prisma.$transaction(async (tx) => {
        const created = await tx.portalAccount.create({
          data: {
            id: userId,
            email: lead.email,
            fullName: lead.name,
            role: lead.profile,
            leadId: lead.id,
          },
        });
        await tx.lead.update({
          where: { id: lead.id },
          data: {
            status: 'converti',
            convertedById: actorId,
            convertedAt: new Date(),
          },
        });
        return created;
      });
    } catch (transactionError) {
      try {
        await this.supabaseAdmin.client.auth.admin.deleteUser(userId);
      } catch (cleanupError) {
        this.logger.error(
          `Échec du nettoyage du compte Supabase Auth orphelin ${userId} après échec de la transaction`,
          cleanupError instanceof Error ? cleanupError.stack : undefined,
        );
      }
      throw transactionError;
    }

    await this.dispatchCredentials({
      lead,
      portalAccount,
      tempPassword,
      actorId,
    });

    await this.activityLog.log(
      actorId,
      'validate_lead_create_portal_account',
      'leads',
      lead.id,
    );

    return portalAccount;
  }

  async resendCredentials(leadId: string, actorId: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      include: { portalAccount: true },
    });
    if (!lead) {
      throw new NotFoundException('Lead introuvable');
    }
    if (!lead.portalAccount) {
      throw new NotFoundException('Aucun compte portail pour ce lead');
    }

    const tempPassword = generateTemporaryPassword();

    const { error } = await this.supabaseAdmin.client.auth.admin.updateUserById(
      lead.portalAccount.id,
      { password: tempPassword },
    );
    if (error) {
      throw error;
    }

    await this.dispatchCredentials({
      lead,
      portalAccount: lead.portalAccount,
      tempPassword,
      actorId,
    });

    await this.activityLog.log(
      actorId,
      'resend_portal_credentials',
      'leads',
      lead.id,
    );
  }

  private async dispatchCredentials({
    lead,
    portalAccount,
    tempPassword,
    actorId,
  }: {
    lead: { id: string; email: string; profile: string };
    portalAccount: { id: string; fullName: string };
    tempPassword: string;
    actorId: string;
  }) {
    const html = renderWelcomeEmail({
      fullName: portalAccount.fullName,
      email: lead.email,
      tempPassword,
      role: lead.profile,
      portalUrl: resolvePortalUrl(lead.profile),
    });

    let deliveryStatus: 'envoye' | 'echec' = 'envoye';
    let emailProviderId: string | undefined;
    try {
      const result = await this.emailService.send({
        to: lead.email,
        subject: 'Bienvenue sur Nafoore — vos identifiants de connexion',
        html,
      });
      emailProviderId = result.providerId;
    } catch (sendError) {
      deliveryStatus = 'echec';
      this.logger.error(
        `Échec d'envoi de l'email d'identifiants pour le lead ${lead.id}`,
        sendError instanceof Error ? sendError.stack : undefined,
      );
    }

    await this.prisma.credentialDispatchLog.create({
      data: {
        leadId: lead.id,
        portalAccountId: portalAccount.id,
        sentById: actorId,
        deliveryStatus,
        emailProviderId,
      },
    });
  }
}
