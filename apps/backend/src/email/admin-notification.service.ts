import { Injectable, Logger } from '@nestjs/common';
import { EmailService } from './email.service';
import { resolvePortalUrl } from './portal-url.util';
import { renderAdminNotificationEmail } from './templates/admin-notification.template';
import { PrismaService } from '../prisma/prisma.service';
import { ZoneKind, ZoneService } from '../auth/zone.service';
import { AdminModule, hasPermission } from '../auth/permissions';
import { AuthenticatedAdmin } from '../auth/supabase-auth.guard';

// Adresse(s) de test tant que la production n'a pas d'adresse admin dediee :
// definir ADMIN_NOTIFICATION_EMAIL (plusieurs adresses separees par des
// virgules) sur Render pour la remplacer, sans toucher au code.
const TEST_RECIPIENT = 'thiernoamadoud751@gmail.com';

export interface NotificationScope {
  module: AdminModule;
  kind: ZoneKind;
  id: string;
}

export interface AdminNotification {
  subject: string;
  title: string;
  lines: string[];
  // Chemin dans l'app admin (ex: /recrutement/abc) pour le bouton du mail.
  path?: string;
  // Rubrique et element concernes : determine quels delegues sont prevenus.
  // Deduit du chemin quand il n'est pas fourni (/leads/:id, /eleves/:id…).
  scope?: NotificationScope;
}

const PATH_SCOPES: { prefix: string; module: AdminModule; kind: ZoneKind }[] = [
  { prefix: '/leads/', module: 'leads', kind: 'lead' },
  { prefix: '/eleves/', module: 'students', kind: 'student' },
  { prefix: '/enseignants/', module: 'teachers', kind: 'teacher' },
  { prefix: '/recrutement/', module: 'recruitment', kind: 'application' },
  { prefix: '/demandes-professeur/', module: 'teacher_requests', kind: 'teacherRequest' },
];

function scopeFromPath(path?: string): NotificationScope | undefined {
  if (!path) return undefined;
  const match = PATH_SCOPES.find((s) => path.startsWith(s.prefix));
  const id = match && path.slice(match.prefix.length).split(/[/?#]/)[0];
  return match && id ? { module: match.module, kind: match.kind, id } : undefined;
}

@Injectable()
export class AdminNotificationService {
  private readonly logger = new Logger(AdminNotificationService.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly prisma: PrismaService,
    private readonly zone: ZoneService,
  ) {}

  // Boite(s) de Nafoore (Super Admin) : recoivent toutes les notifications.
  private recipients(): string[] {
    const configured = process.env.ADMIN_NOTIFICATION_EMAIL;
    const list = (configured || TEST_RECIPIENT)
      .split(',')
      .map((address) => address.trim())
      .filter(Boolean);
    return list.length > 0 ? list : [TEST_RECIPIENT];
  }

  // Delegues (admins actifs) concernes : droit de consultation sur la
  // rubrique ET element dans leur zone (un delegue sans zone voit tout).
  private async delegateRecipients(scope: NotificationScope): Promise<string[]> {
    const accounts = await this.prisma.adminAccount.findMany({
      where: { isActive: true, roles: { some: { role: { name: 'admin' } } } },
      include: { roles: { include: { role: true } } },
    });
    const emails: string[] = [];
    for (const account of accounts) {
      const { roles, ...rest } = account;
      const admin: AuthenticatedAdmin = { ...rest, roleNames: roles.map((r) => r.role.name) };
      if (!hasPermission(admin, scope.module)) continue;
      try {
        await this.zone.assertVisible(admin, scope.kind, scope.id);
        emails.push(account.email);
      } catch {
        // hors de la zone de ce delegue
      }
    }
    return emails;
  }

  // Best-effort et sans await cote appelant : une notification admin ne doit
  // jamais retarder ni faire echouer l'action metier qui la declenche.
  notify(notification: AdminNotification): void {
    this.dispatch(notification).catch((error) =>
      this.logger.error(
        `Échec de la notification admin "${notification.subject}"`,
        error instanceof Error ? error.stack : undefined,
      ),
    );
  }

  private async dispatch({ subject, title, lines, path, scope }: AdminNotification) {
    const html = renderAdminNotificationEmail({
      title,
      lines,
      ctaUrl: path ? `${resolvePortalUrl('admin')}${path}` : undefined,
    });

    const resolved = scope ?? scopeFromPath(path);
    const delegates = resolved ? await this.delegateRecipients(resolved) : [];
    const recipients = [...new Set([...this.recipients(), ...delegates].map((e) => e.toLowerCase()))];

    for (const to of recipients) {
      this.emailService
        .send({ to, subject: `[Admin] ${subject}`, html })
        .catch((error) =>
          this.logger.error(
            `Échec d'envoi de la notification admin "${subject}" à ${to}`,
            error instanceof Error ? error.stack : undefined,
          ),
        );
    }
  }
}
