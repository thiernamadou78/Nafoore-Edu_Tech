import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EmailService } from '../email/email.service';
import { renderContractExpiryAlertEmail } from '../email/templates/contract-expiry-alert.template';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_ALERT_DAYS = 30;
const DEFAULT_NAFOORE_ALERT_EMAIL = 'contact@nafoore.fr';

@Injectable()
export class ContractExpiryService {
  private readonly logger = new Logger(ContractExpiryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async run() {
    await this.expireDueContracts();
    await this.sendExpiryAlerts();
  }

  private async expireDueContracts() {
    const result = await this.prisma.enterpriseContract.updateMany({
      where: { statut: 'actif', dateExpiration: { lte: new Date() } },
      data: { statut: 'expire' },
    });
    if (result.count > 0) {
      this.logger.log(`${result.count} contrat(s) entreprise passé(s) au statut 'expire'`);
    }
  }

  private async sendExpiryAlerts() {
    const alertDays = Number(process.env.CONTRACT_EXPIRY_ALERT_DAYS) || DEFAULT_ALERT_DAYS;
    const threshold = new Date(Date.now() + alertDays * 24 * 60 * 60 * 1000);
    const nafooreEmail = process.env.NAFOORE_ALERTS_EMAIL || DEFAULT_NAFOORE_ALERT_EMAIL;
    const adminUrlBase = process.env.ADMIN_URL;

    const contracts = await this.prisma.enterpriseContract.findMany({
      where: {
        statut: 'actif',
        expiryAlertSentAt: null,
        dateExpiration: { lte: threshold },
      },
      include: {
        formula: { select: { nom: true } },
        enterprise: {
          include: { rhAccounts: { where: { role: 'owner' }, select: { email: true } } },
        },
      },
    });

    for (const contract of contracts) {
      const daysRemaining = Math.max(
        0,
        Math.ceil((contract.dateExpiration.getTime() - Date.now()) / (24 * 60 * 60 * 1000)),
      );

      const html = renderContractExpiryAlertEmail({
        enterpriseName: contract.enterprise.raisonSociale,
        formulaName: contract.formula.nom,
        dateExpiration: contract.dateExpiration,
        daysRemaining,
        adminUrl: adminUrlBase ? `${adminUrlBase}/entreprises/${contract.enterpriseId}` : undefined,
      });

      const recipients = [
        nafooreEmail,
        ...contract.enterprise.rhAccounts.map((account) => account.email),
      ];

      for (const to of recipients) {
        try {
          await this.emailService.send({
            to,
            subject: `Nafoore Education — Le contrat ${contract.enterprise.raisonSociale} expire dans ${daysRemaining} jour(s)`,
            html,
          });
        } catch (sendError) {
          this.logger.error(
            `Échec d'envoi de l'alerte d'expiration du contrat ${contract.id} à ${to}`,
            sendError instanceof Error ? sendError.stack : undefined,
          );
        }
      }

      await this.prisma.enterpriseContract.update({
        where: { id: contract.id },
        data: { expiryAlertSentAt: new Date() },
      });
    }

    if (contracts.length > 0) {
      this.logger.log(`Alerte d'expiration envoyée pour ${contracts.length} contrat(s)`);
    }
  }
}
