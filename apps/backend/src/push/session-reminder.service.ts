import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from './push.service';

// Fenêtre avant le début/la fin prévue d'une séance pendant laquelle on
// envoie le rappel — un cron qui tourne chaque minute laisse largement le
// temps de tomber dans cette fenêtre une fois.
const REMINDER_WINDOW_MINUTES = 10;

@Injectable()
export class SessionReminderService {
  private readonly logger = new Logger(SessionReminderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pushService: PushService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async run() {
    await this.sendCheckinReminders();
    await this.sendCheckoutReminders();
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

    const openLogs = await this.prisma.attendanceLog.findMany({
      where: { checkoutAt: null, sessionId: { not: null } },
      include: {
        session: { include: { student: { select: { name: true } } } },
      },
    });

    let sent = 0;
    for (const log of openLogs) {
      const session = log.session;
      if (!session || !session.teacherId || session.checkoutReminderSentAt) continue;

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
}
