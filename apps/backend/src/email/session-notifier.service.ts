import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from './email.service';
import { resolvePortalUrl } from './portal-url.util';
import { renderNoticeEmail } from './templates/notice.template';

@Injectable()
export class SessionNotifierService {
  private readonly logger = new Logger(SessionNotifierService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  // Best-effort : ne doit jamais faire echouer la planification elle-meme.
  notifyPlanned(sessionId: string): void {
    this.send(sessionId).catch((error) =>
      this.logger.error(
        `Échec d'envoi de l'email de séance planifiée (${sessionId})`,
        error instanceof Error ? error.stack : undefined,
      ),
    );
  }

  private async send(sessionId: string) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        teacher: { select: { name: true } },
        student: {
          select: {
            name: true,
            parentLead: {
              select: {
                name: true,
                gender: true,
                email: true,
                portalAccount: { select: { email: true, fullName: true } },
              },
            },
          },
        },
      },
    });
    const lead = session?.student.parentLead;
    const recipient = lead?.portalAccount?.email ?? lead?.email;
    if (!session || !lead || !recipient) return;

    const when = session.date.toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' });
    const teacher = session.teacher ? ` avec ${session.teacher.name}` : '';
    const subject = session.subject ? ` de ${session.subject}` : '';

    await this.emailService.send({
      to: recipient,
      subject: `Nafoore Education — Séance planifiée pour ${session.student.name}`,
      html: renderNoticeEmail({
        gender: lead.gender,
        fullName: lead.portalAccount?.fullName ?? lead.name,
        label: 'Séance planifiée',
        paragraphs: [
          `Une séance${subject} est planifiée pour ${session.student.name}${teacher} le ${when} (${session.durationMinutes} min).`,
          "Retrouvez le planning complet dans votre espace famille.",
        ],
        ctaUrl: resolvePortalUrl('famille'),
        ctaLabel: 'Voir le planning →',
      }),
    });
  }
}
