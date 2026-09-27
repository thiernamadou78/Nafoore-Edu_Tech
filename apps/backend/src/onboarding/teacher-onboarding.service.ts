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
import { createAuthUserReclaimingOrphans } from './create-auth-user.util';
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

    let userId: string;
    try {
      userId = await createAuthUserReclaimingOrphans(
        this.supabaseAdmin,
        application.candidateEmail,
        tempPassword,
        (id) => this.prisma.teacherAccount.findUnique({ where: { id } }).then((a) => !a),
      );
    } catch (error) {
      if ((error as Error)?.message?.toLowerCase().includes('already')) {
        throw new ConflictException(
          `Un compte existe déjà avec l'adresse ${application.candidateEmail}. Vérifie qu'il ne s'agit pas d'un doublon avant de continuer.`,
        );
      }
      throw error;
    }

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

    await this.dispatchCredentials({
      applicationId: application.id,
      email: application.candidateEmail,
      gender: application.gender,
      teacherAccount,
      tempPassword,
      actorId,
    });

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
      applicationId: application.id,
      email: application.candidateEmail,
      gender: application.gender,
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

  // Enseignant ajoute directement par l'admin (sans candidature), ou deja
  // passe par le recrutement : cree le compte portail si besoin, sinon
  // regenere un mot de passe provisoire, puis envoie les identifiants.
  async sendCredentialsToTeacher(teacherId: string, actorId: string) {
    const teacher = await this.prisma.teacher.findUnique({
      where: { id: teacherId },
      include: { account: true, application: { include: { teacherAccount: true } } },
    });
    if (!teacher) throw new NotFoundException('Enseignant introuvable');

    const existing = teacher.account ?? teacher.application?.teacherAccount ?? null;
    const tempPassword = generateTemporaryPassword();

    if (existing) {
      const { error } = await this.supabaseAdmin.client.auth.admin.updateUserById(existing.id, {
        password: tempPassword,
      });
      if (error) throw error;
      const account = existing.teacherId
        ? existing
        : await this.prisma.teacherAccount.update({ where: { id: existing.id }, data: { teacherId } });
      // Nouveau mot de passe provisoire : a changer a la prochaine connexion.
      await this.prisma.teacherAccount.update({ where: { id: account.id }, data: { mustChangePassword: true } });
      await this.dispatchCredentials({
        applicationId: account.teacherApplicationId,
        email: account.email,
        gender: teacher.gender,
        teacherAccount: account,
        tempPassword,
        actorId,
      });
      await this.activityLog.log(actorId, 'resend_teacher_credentials', 'teachers', teacherId);
      return { created: false, email: account.email };
    }

    const email = teacher.email?.trim().toLowerCase();
    if (!email) {
      throw new BadRequestException("Renseignez l'email de l'enseignant avant de lui envoyer ses identifiants.");
    }

    let userId: string;
    try {
      userId = await createAuthUserReclaimingOrphans(
        this.supabaseAdmin,
        email,
        tempPassword,
        (id) => this.prisma.teacherAccount.findUnique({ where: { id } }).then((a) => !a),
      );
    } catch (error) {
      if ((error as Error)?.message?.toLowerCase().includes('already')) {
        throw new ConflictException(
          `Un compte existe déjà avec l'adresse ${email} (famille, admin ou autre enseignant). Utilisez une autre adresse pour cet enseignant.`,
        );
      }
      throw error;
    }

    let teacherAccount;
    try {
      teacherAccount = await this.prisma.teacherAccount.create({
        data: {
          id: userId,
          email,
          fullName: teacher.name,
          teacherId,
          teacherApplicationId: teacher.application?.id ?? null,
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

    await this.dispatchCredentials({
      applicationId: teacher.application?.id ?? null,
      email,
      gender: teacher.gender,
      teacherAccount,
      tempPassword,
      actorId,
    });
    await this.activityLog.log(actorId, 'create_teacher_account', 'teachers', teacherId);
    return { created: true, email };
  }

  private async dispatchCredentials({
    applicationId,
    email,
    gender,
    teacherAccount,
    tempPassword,
    actorId,
  }: {
    applicationId: string | null;
    email: string;
    gender?: string | null;
    teacherAccount: { id: string; fullName: string };
    tempPassword: string;
    actorId: string;
  }) {
    const html = renderWelcomeEmail({
      gender,
      fullName: teacherAccount.fullName,
      email,
      tempPassword,
      role: 'teacher',
      portalUrl: resolvePortalUrl('teacher'),
    });

    let deliveryStatus: 'envoye' | 'echec' = 'envoye';
    let emailProviderId: string | undefined;
    try {
      const result = await this.emailService.send({
        to: email,
        subject: 'Bienvenue sur Nafoore Education — vos identifiants de connexion',
        html,
      });
      emailProviderId = result.providerId;
    } catch (sendError) {
      deliveryStatus = 'echec';
      this.logger.error(
        `Échec d'envoi de l'email d'identifiants à ${email}`,
        sendError instanceof Error ? sendError.stack : undefined,
      );
    }

    await this.prisma.teacherCredentialDispatchLog.create({
      data: {
        teacherApplicationId: applicationId,
        teacherAccountId: teacherAccount.id,
        sentById: actorId,
        deliveryStatus,
        emailProviderId,
      },
    });
  }
}
