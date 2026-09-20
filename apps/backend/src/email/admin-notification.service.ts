import { Injectable, Logger } from '@nestjs/common';
import { EmailService } from './email.service';
import { resolvePortalUrl } from './portal-url.util';
import { renderAdminNotificationEmail } from './templates/admin-notification.template';

// Adresse(s) de test tant que la production n'a pas d'adresse admin dediee :
// definir ADMIN_NOTIFICATION_EMAIL (plusieurs adresses separees par des
// virgules) sur Render pour la remplacer, sans toucher au code.
const TEST_RECIPIENT = 'thiernoamadoud751@gmail.com';

export interface AdminNotification {
  subject: string;
  title: string;
  lines: string[];
  // Chemin dans l'app admin (ex: /recrutement/abc) pour le bouton du mail.
  path?: string;
}

@Injectable()
export class AdminNotificationService {
  private readonly logger = new Logger(AdminNotificationService.name);

  constructor(private readonly emailService: EmailService) {}

  private recipients(): string[] {
    const configured = process.env.ADMIN_NOTIFICATION_EMAIL;
    const list = (configured || TEST_RECIPIENT)
      .split(',')
      .map((address) => address.trim())
      .filter(Boolean);
    return list.length > 0 ? list : [TEST_RECIPIENT];
  }

  // Best-effort et sans await cote appelant : une notification admin ne doit
  // jamais retarder ni faire echouer l'action metier qui la declenche.
  notify({ subject, title, lines, path }: AdminNotification): void {
    const html = renderAdminNotificationEmail({
      title,
      lines,
      ctaUrl: path ? `${resolvePortalUrl('admin')}${path}` : undefined,
    });

    for (const to of this.recipients()) {
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
