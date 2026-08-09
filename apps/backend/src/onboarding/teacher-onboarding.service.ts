import {
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

@Injectable()
export class TeacherOnboardingService {
  private readonly logger = new Logger(TeacherOnboardingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLog: ActivityLogService,
    private readonly supabaseAdmin: SupabaseAdminService,
    private readonly emailService: EmailService,
  ) {}

  async createAccount(applicationId: string, actorId: string) {
    const application = await this.prisma.teacherApplication.findUnique({
      where: { id: applicationId },
      include: { teacherAccount: true },
    });
    if (!application) {
      throw new NotFoundException('Candidature introuvable');
    }
    if (application.status !== 'valide') {
      throw new ConflictException(
        `La candidature doit être au statut validé (actuel : ${application.status})`,
      );
    }
    if (application.teacherAccount) {
      throw new ConflictException('Un compte existe déjà pour cette candidature');
    }

    const tempPassword = generateTemporaryPassword();

    const { data, error } = await this.supabaseAdmin.client.auth.admin.createUser({
      email: application.candidateEmail,
      password: tempPassword,
      email_confirm: true,
    });
    if (error || !data.user) {
      if (error?.message?.toLowerCase().includes('already')) {
        throw new ConflictException(
          `Un compte existe déjà avec l'adresse ${application.candidateEmail}. Vérifie qu'il ne s'agit pas d'un doublon avant de continuer.`,
        );
      }
      throw error ?? new Error('Échec de la création du compte');
    }

    const userId = data.user.id;

    let teacherAccount;
    try {
      teacherAccount = await this.prisma.teacherAccount.create({
        data: {
          id: userId,
          email: application.candidateEmail,
          fullName: application.candidateName,
          teacherApplicationId: application.id,
          teacherId: application.createdTeacherId,
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

    await this.dispatchCredentials({ application, teacherAccount, tempPassword, actorId });

    await this.activityLog.log(
      actorId,
      'create_teacher_account',
      'teacher_applications',
      application.id,
    );

    return teacherAccount;
  }

  async resendCredentials(applicationId: string, actorId: string) {
    const application = await this.prisma.teacherApplication.findUnique({
      where: { id: applicationId },
      include: { teacherAccount: true },
    });
    if (!application) {
      throw new NotFoundException('Candidature introuvable');
    }
    if (!application.teacherAccount) {
      throw new NotFoundException('Aucun compte enseignant pour cette candidature');
    }

    const tempPassword = generateTemporaryPassword();

    const { error } = await this.supabaseAdmin.client.auth.admin.updateUserById(
      application.teacherAccount.id,
      { password: tempPassword },
    );
    if (error) {
      throw error;
    }

    await this.dispatchCredentials({
      application,
      teacherAccount: application.teacherAccount,
      tempPassword,
      actorId,
    });

    await this.activityLog.log(
      actorId,
      'resend_teacher_credentials',
      'teacher_applications',
      application.id,
    );
  }

  private async dispatchCredentials({
    application,
    teacherAccount,
    tempPassword,
    actorId,
  }: {
    application: { id: string; candidateEmail: string };
    teacherAccount: { id: string; fullName: string };
    tempPassword: string;
    actorId: string;
  }) {
    const html = renderWelcomeEmail({
      fullName: teacherAccount.fullName,
      email: application.candidateEmail,
      tempPassword,
      role: 'teacher',
      portalUrl: resolvePortalUrl('teacher'),
    });

    let deliveryStatus: 'envoye' | 'echec' = 'envoye';
    let emailProviderId: string | undefined;
    try {
      const result = await this.emailService.send({
        to: application.candidateEmail,
        subject: 'Bienvenue sur Nafoore — vos identifiants de connexion',
        html,
      });
      emailProviderId = result.providerId;
    } catch (sendError) {
      deliveryStatus = 'echec';
      this.logger.error(
        `Échec d'envoi de l'email d'identifiants pour la candidature ${application.id}`,
        sendError instanceof Error ? sendError.stack : undefined,
      );
    }

    await this.prisma.teacherCredentialDispatchLog.create({
      data: {
        teacherApplicationId: application.id,
        teacherAccountId: teacherAccount.id,
        sentById: actorId,
        deliveryStatus,
        emailProviderId,
      },
    });
  }
}
