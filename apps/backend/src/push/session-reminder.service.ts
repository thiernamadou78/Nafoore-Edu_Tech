import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import {
  renderSessionUpcomingFamilyEmail,
  renderSessionUpcomingTeacherEmail,
} from '../email/templates/session-upcoming.template';
import { resolvePortalUrl } from '../email/portal-url.util';
import { PushService } from './push.service';

// Fenêtre avant le début/la fin prévue d'une séance pendant laquelle on
// envoie le rappel — un cron qui tourne chaque minute laisse largement le
// temps de tomber dans cette fenêtre une fois.
const REMINDER_WINDOW_MINUTES = 10;
// Un pointage de fin oublié ne doit pas rester sans rappel indéfiniment : on
// relance tant que la séance reste "en cours" (pas de check-out), au lieu de
// n'envoyer qu'un seul rappel jamais répété.
const CHECKOUT_REMINDER_REPEAT_MINUTES = 30;
// Rappel par email ~5h avant le début — fenêtre de capture large (10 min)
// autour de la marque des 5h pour ne rien manquer si le cron rate un tick.
const EMAIL_REMINDER_HOURS_BEFORE = 5;
const EMAIL_REMINDER_CAPTURE_MINUTES = 10;

@Injectable()
export class SessionReminderService {
  private readonly logger = new Logger(SessionReminderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pushService: PushService,
    private readonly emailService: EmailService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async run() {
    await this.sendCheckinReminders();
    await this.sendCheckoutReminders();
    await this.sendUpcomingSessionEmails();
  }

  private async sendCheckinReminders() {
    const now = new Date();
    const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_MINUTES * 60_000);

    const sessions = await this.prisma.session.findMany({
      where: {
        status: { in: ['planifiee', 'confirmee'] },
        date: { gte: now, lte: windowEnd },
        checkinReminderSentAt: null,
        teacherId: { not: null },
        attendanceLogs: { none: {} },
      },
      include: { student: { select: { name: true } } },
    });

    for (const session of sessions) {
      const minutesUntil = Math.max(1, Math.round((session.date.getTime() - now.getTime()) / 60_000));
      await this.pushService.sendToTeacher(session.teacherId as string, {
        title: 'Séance à venir',
        body: `Séance avec ${session.student.name} dans ${minutesUntil} min — pense à scanner le pass pour commencer.`,
        url: '/pointage',
      });
      await this.prisma.session.update({
        where: { id: session.id },
        data: { checkinReminderSentAt: now },
      });
    }

    if (sessions.length > 0) {
      this.logger.log(`${sessions.length} rappel(s) de début de séance envoyé(s)`);
    }
  }

  private async sendCheckoutReminders() {
    const now = new Date();
    const repeatThreshold = new Date(now.getTime() - CHECKOUT_REMINDER_REPEAT_MINUTES * 60_000);

    const openLogs = await this.prisma.attendanceLog.findMany({
      where: { checkoutAt: null, sessionId: { not: null } },
      include: {
        session: { include: { student: { select: { name: true } } } },
      },
    });

    let sent = 0;
    for (const log of openLogs) {
      const session = log.session;
      if (!session || !session.teacherId) continue;
      // "Dernier envoi" plutôt que "déjà envoyé" : on relance tant que le
      // check-out n'a pas eu lieu, au plus une fois toutes les
      // CHECKOUT_REMINDER_REPEAT_MINUTES minutes.
      if (session.checkoutReminderSentAt && session.checkoutReminderSentAt > repeatThreshold) {
        continue;
      }

      const scheduledEnd = new Date(session.date.getTime() + session.durationMinutes * 60_000);
      const minutesUntilEnd = (scheduledEnd.getTime() - now.getTime()) / 60_000;
      if (minutesUntilEnd > REMINDER_WINDOW_MINUTES) continue;

      const body =
        minutesUntilEnd > 0
          ? `Il reste ${Math.max(1, Math.round(minutesUntilEnd))} min sur la séance avec ${session.student.name} — pense à scanner pour marquer la fin.`
          : `La séance avec ${session.student.name} devrait être terminée — pense à scanner pour marquer la fin.`;

      await this.pushService.sendToTeacher(session.teacherId, {
        title: 'Fin de séance',
        body,
        url: '/pointage',
      });
      await this.prisma.session.update({
        where: { id: session.id },
        data: { checkoutReminderSentAt: now },
      });
      sent += 1;
    }

    if (sent > 0) {
      this.logger.log(`${sent} rappel(s) de fin de séance envoyé(s)`);
    }
  }

  // Rappel par email, distinct du rappel push de pointage : celui-ci prévient
  // à l'avance (5h) l'enseignant ET la famille qu'une séance approche, pas
  // seulement le prof au moment de pointer.
  private async sendUpcomingSessionEmails() {
    const now = new Date();
    const windowStart = new Date(
      now.getTime() + (EMAIL_REMINDER_HOURS_BEFORE * 60 - EMAIL_REMINDER_CAPTURE_MINUTES) * 60_000,
    );
    const windowEnd = new Date(
      now.getTime() + EMAIL_REMINDER_HOURS_BEFORE * 60 * 60_000,
    );

    const sessions = await this.prisma.session.findMany({
      where: {
        status: { in: ['planifiee', 'confirmee'] },
        date: { gte: windowStart, lte: windowEnd },
        emailReminderSentAt: null,
        teacherId: { not: null },
      },
      include: {
        student: {
          select: {
            name: true,
            parentLead: {
              select: { email: true, portalAccount: { select: { email: true } } },
            },
          },
        },
        teacher: { select: { name: true, account: { select: { email: true } } } },
      },
    });

    let sent = 0;
    for (const session of sessions) {
      const sessionDate = session.date.toLocaleString('fr-FR', {
        dateStyle: 'full',
        timeStyle: 'short',
      });

      const teacherEmail = session.teacher?.account?.email;
      if (teacherEmail) {
        this.emailService
          .send({
            to: teacherEmail,
            subject: `Nafoore Education — Séance à venir avec ${session.student.name}`,
            html: renderSessionUpcomingTeacherEmail({
              recipientName: session.teacher?.name ?? '',
              studentName: session.student.name,
              teacherName: session.teacher?.name ?? '',
              subject: session.subject,
              sessionDate,
              portalUrl: resolvePortalUrl('teacher'),
            }),
          })
          .catch((error) =>
            this.logger.error(
              `Échec d'envoi du rappel de séance (prof) pour la séance ${session.id}`,
              error instanceof Error ? error.stack : undefined,
            ),
          );
      }

      const familyEmail =
        session.student.parentLead?.portalAccount?.email ?? session.student.parentLead?.email;
      if (familyEmail) {
        this.emailService
          .send({
            to: familyEmail,
            subject: `Nafoore Education — Séance à venir pour ${session.student.name}`,
            html: renderSessionUpcomingFamilyEmail({
              recipientName: session.student.name,
              studentName: session.student.name,
              teacherName: session.teacher?.name ?? '',
              subject: session.subject,
              sessionDate,
              portalUrl: resolvePortalUrl('famille'),
            }),
          })
          .catch((error) =>
            this.logger.error(
              `Échec d'envoi du rappel de séance (famille) pour la séance ${session.id}`,
              error instanceof Error ? error.stack : undefined,
            ),
          );
      }

      await this.prisma.session.update({
        where: { id: session.id },
        data: { emailReminderSentAt: now },
      });
      sent += 1;
    }

    if (sent > 0) {
      this.logger.log(`${sent} rappel(s) de séance à venir envoyé(s) par email`);
    }
  }
}
