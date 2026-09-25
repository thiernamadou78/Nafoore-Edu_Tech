import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { AdminNotificationService } from '../email/admin-notification.service';
import { resolvePortalUrl } from '../email/portal-url.util';
import { renderNoticeEmail } from '../email/templates/notice.template';
import { getPlatformTimezone } from '../common/timezone';

// En dessous de ce delai avant la seance, une annulation / un report est
// signale comme tardif dans les emails.
export const LATE_CHANGE_HOURS = 3;

export type ChangeActor =
  | { kind: 'famille'; name: string }
  | { kind: 'enseignant'; name: string }
  | { kind: 'admin'; name: string };

type ChangeKind = 'postponed' | 'cancelled' | 'rescheduled';

const sessionInclude = {
  student: {
    select: {
      id: true,
      name: true,
      parentLeadId: true,
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
  teacher: { select: { id: true, name: true, gender: true, email: true, account: { select: { email: true } } } },
} as const;

type SessionWithPeople = Prisma.SessionGetPayload<{ include: typeof sessionInclude }>;

function actorLabel(actor: ChangeActor) {
  if (actor.kind === 'famille') return `le parent (${actor.name})`;
  if (actor.kind === 'enseignant') return `l'enseignant (${actor.name})`;
  return `l'équipe Nafoore (${actor.name})`;
}

function formatDateTime(date: Date) {
  return date.toLocaleString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: getPlatformTimezone(),
  });
}

// "3 h 20 min avant la séance" / "après l'heure prévue".
export function delayBefore(sessionDate: Date, at: Date) {
  const minutes = Math.round((sessionDate.getTime() - at.getTime()) / 60_000);
  if (minutes <= 0) return { text: "après l'heure prévue de la séance", late: true };
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  const parts = [
    days ? `${days} j` : null,
    hours ? `${hours} h` : null,
    !days && mins ? `${mins} min` : null,
  ].filter(Boolean);
  return {
    text: `${parts.join(' ') || 'moins d’une minute'} avant la séance`,
    late: minutes < LATE_CHANGE_HOURS * 60,
  };
}

// Report, annulation et arret de programme : regles communes (famille,
// enseignant, admin) et emails aux autres acteurs en precisant QUI a fait
// l'action, le MOTIF et COMBIEN DE TEMPS avant la seance.
@Injectable()
export class SessionChangesService {
  private readonly logger = new Logger(SessionChangesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly adminNotification: AdminNotificationService,
  ) {}

  // ------------------------------------------------------------- famille

  private async loadFamilySession(leadId: string, sessionId: string) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { ...sessionInclude, attendanceLogs: { where: { checkinAt: { not: null } }, take: 1 } },
    });
    if (!session || session.student.parentLeadId !== leadId) {
      throw new NotFoundException('Séance introuvable');
    }
    if (!['planifiee', 'confirmee'].includes(session.status)) {
      throw new BadRequestException('Cette séance ne peut plus être décalée ni annulée');
    }
    if (session.attendanceLogs.length > 0) {
      throw new BadRequestException('La séance a déjà commencé (arrivée pointée)');
    }
    return session;
  }

  // La famille ne choisit pas de creneau (elle appelle generalement le prof
  // avant) : la seance passe "a replanifier" et l'enseignant choisit la
  // nouvelle date.
  async postponeByFamily(portal: { leadId: string; fullName: string }, sessionId: string, reason?: string) {
    const session = await this.loadFamilySession(portal.leadId, sessionId);
    const now = new Date();
    const updated = await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        status: 'reportee',
        postponeReason: reason?.trim() || null,
        changedBy: 'famille',
        changedAt: now,
      },
    });
    this.notify('postponed', session, { kind: 'famille', name: portal.fullName }, reason, now);
    return updated;
  }

  async cancelByFamily(portal: { leadId: string; fullName: string }, sessionId: string, reason: string) {
    if (!reason?.trim()) throw new BadRequestException("Un motif d'annulation est requis");
    const session = await this.loadFamilySession(portal.leadId, sessionId);
    const now = new Date();
    const updated = await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        status: 'annulee',
        cancellationReason: reason.trim(),
        changedBy: 'famille',
        changedAt: now,
      },
    });
    this.notify('cancelled', session, { kind: 'famille', name: portal.fullName }, reason, now);
    return updated;
  }

  // --------------------------------------------- enseignant (apres update)

  async notifyTeacherChange(
    kind: 'cancelled' | 'rescheduled',
    sessionId: string,
    reason: string | undefined,
    previousDate?: Date,
  ) {
    const session = await this.prisma.session.findUnique({ where: { id: sessionId }, include: sessionInclude });
    if (!session?.teacher) return;
    this.notify(kind, session, { kind: 'enseignant', name: session.teacher.name }, reason, new Date(), previousDate);
  }

  // ----------------------------------------------- arret d'un programme

  async stopProgram(scheduleId: string, actor: ChangeActor, reason: string) {
    if (!reason?.trim()) throw new BadRequestException("Un motif d'arrêt du programme est requis");
    const schedule = await this.prisma.recurringSchedule.findUnique({
      where: { id: scheduleId },
      include: {
        student: { select: sessionInclude.student.select },
        teacher: { select: sessionInclude.teacher.select },
      },
    });
    if (!schedule || !schedule.active) throw new NotFoundException('Programme introuvable ou déjà arrêté');

    const now = new Date();
    const { count } = await this.prisma.session.deleteMany({
      where: { scheduleId, date: { gt: now }, status: { in: ['planifiee', 'confirmee', 'reportee'] } },
    });
    await this.prisma.recurringSchedule.update({
      where: { id: scheduleId },
      data: { active: false, stoppedReason: reason.trim(), stoppedBy: actor.kind, stoppedAt: now },
    });

    const who = actorLabel(actor);
    const paragraphs = [
      `Le programme de ${schedule.subject} de ${schedule.student.name} avec ${schedule.teacher.name} a été arrêté par ${who}.`,
      `Motif : ${reason.trim()}`,
      `${count} séance${count > 1 ? 's' : ''} à venir ${count > 1 ? 'ont été retirées' : 'a été retirée'} du planning.`,
    ];
    const subject = `Programme arrêté : ${schedule.subject} — ${schedule.student.name}`;
    const family = schedule.student.parentLead;
    const familyEmail = family?.portalAccount?.email ?? family?.email;
    const teacherEmail = schedule.teacher.account?.email ?? schedule.teacher.email;
    if (familyEmail && family) {
      this.send(familyEmail, subject, family.portalAccount?.fullName ?? family.name, family.gender, 'Programme arrêté', paragraphs, 'famille');
    }
    if (teacherEmail && actor.kind !== 'enseignant') {
      this.send(teacherEmail, subject, schedule.teacher.name, schedule.teacher.gender, 'Programme arrêté', paragraphs, 'teacher');
    }
    this.adminNotification.notify({
      subject,
      title: 'Programme arrêté',
      lines: paragraphs,
      path: `/eleves/${schedule.student.id}`,
    });
    return { removedSessions: count };
  }

  // ------------------------------------------------------------- emails

  private notify(
    kind: ChangeKind,
    session: SessionWithPeople,
    actor: ChangeActor,
    reason: string | undefined,
    at: Date,
    previousDate?: Date,
  ) {
    const originalDate = previousDate ?? session.date;
    const delay = delayBefore(originalDate, at);
    const course = `${session.subject ?? 'Séance'} de ${session.student.name}`;
    const who = actorLabel(actor);
    const when = formatDateTime(originalDate);

    const title = {
      postponed: 'Séance à décaler',
      cancelled: delay.late ? 'Annulation tardive' : 'Séance annulée',
      rescheduled: 'Séance déplacée',
    }[kind];
    const action = {
      postponed: `a demandé à décaler la séance de ${course} prévue le ${when}`,
      cancelled: `a annulé la séance de ${course} prévue le ${when}`,
      rescheduled: `a déplacé la séance de ${course} prévue le ${when} au ${formatDateTime(session.date)}`,
    }[kind];

    const paragraphs = [
      `${who.charAt(0).toUpperCase()}${who.slice(1)} ${action}.`,
      `Délai : ${delay.text}${delay.late && kind !== 'rescheduled' ? ` (moins de ${LATE_CHANGE_HOURS} h avant).` : '.'}`,
      reason?.trim() ? `Motif : ${reason.trim()}` : 'Aucun motif précisé.',
    ];
    if (kind === 'postponed') {
      paragraphs.push(
        "La séance est marquée « à replanifier » : l'enseignant choisit le nouveau créneau depuis son planning.",
      );
    }

    const subject = `${title} : ${course}`;
    const family = session.student.parentLead;
    const familyEmail = family?.portalAccount?.email ?? family?.email;
    const teacherEmail = session.teacher?.account?.email ?? session.teacher?.email;

    // Destinataires : tous les acteurs sauf celui qui a fait l'action.
    if (actor.kind !== 'enseignant' && teacherEmail && session.teacher) {
      const teacherParagraphs =
        kind === 'postponed'
          ? [...paragraphs.slice(0, -1), 'Choisissez un nouveau créneau depuis votre planning (bouton « Décaler » sur la séance).']
          : paragraphs;
      this.send(teacherEmail, subject, session.teacher.name, session.teacher.gender, title, teacherParagraphs, 'teacher');
    }
    if (actor.kind !== 'famille' && familyEmail && family) {
      this.send(familyEmail, subject, family.portalAccount?.fullName ?? family.name, family.gender, title, paragraphs, 'famille');
    }
    this.adminNotification.notify({
      subject,
      title,
      lines: paragraphs,
      path: `/eleves/${session.student.id}`,
    });
  }

  private send(
    to: string,
    subject: string,
    fullName: string,
    gender: string | null | undefined,
    label: string,
    paragraphs: string[],
    portal: 'famille' | 'teacher',
  ) {
    this.emailService
      .send({
        to,
        subject: `Nafoore Education — ${subject}`,
        html: renderNoticeEmail({
          fullName,
          gender,
          label,
          paragraphs,
          ctaUrl: `${resolvePortalUrl(portal)}/planning`,
          ctaLabel: 'Voir le planning →',
        }),
      })
      .catch((error) =>
        this.logger.error(`Échec d'envoi "${subject}" à ${to}`, error instanceof Error ? error.stack : undefined),
      );
  }
}
