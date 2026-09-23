import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseAdminService } from '../auth/supabase-admin.service';
import { EmailService } from '../email/email.service';
import { resolvePortalUrl } from '../email/portal-url.util';
import { renderNoticeEmail } from '../email/templates/notice.template';

export const PASSWORD_PORTALS = ['admin', 'famille', 'enseignant'] as const;
export type PasswordPortal = (typeof PASSWORD_PORTALS)[number];

const PORTAL_URL_ROLE: Record<PasswordPortal, string> = {
  admin: 'admin',
  famille: 'famille',
  enseignant: 'teacher',
};

// Les emails d'invitation et de mot de passe oublie sont envoyes par nous
// (Resend, charte Nafoore) et non par Supabase : Supabase ne fait que
// generer le jeton. Le lien pointe directement vers la page du portail, qui
// valide le jeton (verifyOtp) — on ne depend donc plus du "Site URL" ni de
// la liste des redirections autorisees configures dans Supabase.
@Injectable()
export class AuthEmailsService {
  private readonly logger = new Logger(AuthEmailsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly supabaseAdmin: SupabaseAdminService,
    private readonly emailService: EmailService,
  ) {}

  private buildLink(portal: PasswordPortal, tokenHash: string, type: 'invite' | 'recovery') {
    const base = resolvePortalUrl(PORTAL_URL_ROLE[portal]);
    const params = new URLSearchParams({ token_hash: tokenHash, type });
    return `${base}/reinitialiser-mot-de-passe?${params.toString()}`;
  }

  // Cree l'utilisateur Supabase Auth (sans email Supabase) et renvoie son id
  // + le lien d'activation a envoyer nous-memes.
  async createInvitedUser(email: string) {
    const { data, error } = await this.supabaseAdmin.client.auth.admin.generateLink({
      type: 'invite',
      email,
    });
    if (error || !data.user) {
      throw error ?? new Error("Échec de la création de l'invitation");
    }
    return {
      userId: data.user.id,
      link: this.buildLink('admin', data.properties.hashed_token, 'invite'),
    };
  }

  async sendAdminInvitation(email: string, name: string, link: string) {
    await this.emailService.send({
      to: email,
      subject: 'Nafoore Education — Votre accès à l’espace administration',
      html: renderNoticeEmail({
        fullName: name,
        label: 'Invitation',
        paragraphs: [
          'Un compte vous a été créé sur l’espace administration de Nafoore Education.',
          'Cliquez sur le bouton ci-dessous pour choisir votre mot de passe et activer votre accès. Ce lien est personnel et valable 1 heure.',
          'Si le lien a expiré, demandez à un Super Admin de vous renvoyer une invitation.',
        ],
        ctaUrl: link,
        ctaLabel: 'Activer mon compte →',
      }),
    });
  }

  // Renvoi d'invitation : l'utilisateur existe deja dans Supabase, on genere
  // donc un lien de type "recovery" (il confirme aussi l'email au passage).
  async resendAdminInvitation(email: string, name: string) {
    const link = await this.generateRecoveryLink(email, 'admin');
    if (!link) throw new Error("Impossible de générer le lien d'invitation");
    await this.sendAdminInvitation(email, name, link);
  }

  private async generateRecoveryLink(email: string, portal: PasswordPortal) {
    const { data, error } = await this.supabaseAdmin.client.auth.admin.generateLink({
      type: 'recovery',
      email,
    });
    if (error || !data?.properties?.hashed_token) {
      this.logger.warn(`Lien de réinitialisation non généré pour ${email}: ${error?.message}`);
      return null;
    }
    return this.buildLink(portal, data.properties.hashed_token, 'recovery');
  }

  // N'envoie un lien que si l'email correspond a un compte actif DE CE
  // portail. La reponse HTTP est identique dans tous les cas, pour ne pas
  // reveler quels emails ont un compte.
  async sendPasswordReset(rawEmail: string, portal: PasswordPortal) {
    const email = rawEmail.trim().toLowerCase();
    const where = { email: { equals: email, mode: 'insensitive' as const } };

    let fullName: string | null = null;
    if (portal === 'admin') {
      const account = await this.prisma.adminAccount.findFirst({ where });
      if (account?.isActive) fullName = account.name;
    } else if (portal === 'famille') {
      const account = await this.prisma.portalAccount.findFirst({ where });
      if (account && account.status !== 'suspendu') fullName = account.fullName;
    } else {
      const account = await this.prisma.teacherAccount.findFirst({ where });
      if (account && account.status !== 'suspendu') fullName = account.fullName;
    }
    if (!fullName) {
      this.logger.log(`Mot de passe oublié (${portal}) : aucun compte actif pour ${email}`);
      return;
    }

    const link = await this.generateRecoveryLink(email, portal);
    if (!link) return;

    await this.emailService.send({
      to: email,
      subject: 'Nafoore Education — Réinitialisation de votre mot de passe',
      html: renderNoticeEmail({
        fullName,
        label: 'Mot de passe oublié',
        paragraphs: [
          'Vous avez demandé à réinitialiser votre mot de passe.',
          'Cliquez sur le bouton ci-dessous pour en choisir un nouveau. Ce lien est personnel et valable 1 heure.',
          'Si vous n’êtes pas à l’origine de cette demande, ignorez simplement cet email : votre mot de passe actuel reste inchangé.',
        ],
        ctaUrl: link,
        ctaLabel: 'Choisir un nouveau mot de passe →',
      }),
    });
  }
}
