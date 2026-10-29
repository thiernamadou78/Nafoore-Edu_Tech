import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { renderNoticeEmail } from '../email/templates/notice.template';
import { resolvePortalUrl } from '../email/portal-url.util';
import { formatInPlatformTz } from '../common/timezone';
import { ZoneService } from '../auth/zone.service';
import { AuthenticatedAdmin } from '../auth/supabase-auth.guard';
import { SessionChangesService } from '../session-changes/session-changes.service';

// Au-dela de ce delai apres l'heure prevue, une arrivee compte comme un retard.
export const LATE_THRESHOLD_MINUTES = 15;
// Une seance passee n'est en anomalie qu'apres ce delai (le prof a le temps
// de pointer et de rediger).
const GRACE_HOURS = 2;

const sessionInclude = {
  student: { select: { id: true, name: true } },
  teacher: {
    select: { id: true, name: true, gender: true, email: true, account: { select: { email: true } } },
  },
} as const;

const when = (date: Date) =>
  formatInPlatformTz(date, { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
const hour = (date: Date) => formatInPlatformTz(date, { hour: '2-digit', minute: '2-digit' });
const minutesBetween = (from: Date, to: Date) => Math.max(1, Math.round((to.getTime() - from.getTime()) / 60000));

// Outils de l'equipe Nafoore sur les pointages : cloturer, corriger, saisir a
// la place du prof, marquer une seance non donnee, relancer le prof. Chaque
// intervention est tracee (attendance_corrections) et le prof est prevenu.
@Injectable()
export class AttendanceAdminService {
  private readonly logger = new Logger(AttendanceAdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly zone: ZoneService,
    private readonly email: EmailService,
    private readonly sessionChanges: SessionChangesService,
  ) {}

  private async loadSession(admin: AuthenticatedAdmin, sessionId: string) {
    const session = await this.prisma.session.findUnique({ where: { id: sessionId }, include: sessionInclude });
    if (!session) throw new NotFoundException('Séance introuvable');
    await this.zone.assertVisible(admin, 'student', session.studentId);
    return session;
  }

  private async loadLog(admin: AuthenticatedAdmin, logId: string) {
    const log = await this.prisma.attendanceLog.findUnique({ where: { id: logId } });
    if (!log || !log.sessionId) throw new NotFoundException('Pointage introuvable');
    const session = await this.loadSession(admin, log.sessionId);
    return { log, session };
  }

  private assertTimes(checkinAt: Date, checkoutAt: Date | null) {
    if (Number.isNaN(checkinAt.getTime()) || (checkoutAt && Number.isNaN(checkoutAt.getTime()))) {
      throw new BadRequestException('Heure invalide');
    }
    if (checkoutAt && checkoutAt <= checkinAt) {
      throw new BadRequestException("L'heure de départ doit être après l'heure d'arrivée");
    }
    if (checkoutAt && checkoutAt.getTime() - checkinAt.getTime() > 6 * 3_600_000) {
      throw new BadRequestException('Une séance ne peut pas durer plus de 6 heures');
    }
    if ((checkoutAt ?? checkinAt).getTime() > Date.now() + 5 * 60_000) {
      throw new BadRequestException('Impossible de pointer une heure dans le futur');
    }
  }

  // Duree reelle reportee sur la seance (la duree prevue est conservee).
  private async applyDuration(
    session: { id: string; durationMinutes: number; plannedDurationMinutes: number | null },
    checkinAt: Date,
    checkoutAt: Date,
  ) {
    await this.prisma.session.update({
      where: { id: session.id },
      data: {
        durationMinutes: minutesBetween(checkinAt, checkoutAt),
        plannedDurationMinutes: session.plannedDurationMinutes ?? session.durationMinutes,
      },
    });
  }

  private record(
    admin: AuthenticatedAdmin,
    data: {
      action: 'cloture' | 'correction' | 'saisie' | 'non_donnee';
      sessionId: string;
      attendanceLogId?: string | null;
      previousCheckinAt?: Date | null;
      previousCheckoutAt?: Date | null;
      newCheckinAt?: Date | null;
      newCheckoutAt?: Date | null;
      reason: string;
    },
  ) {
    return this.prisma.attendanceCorrection.create({ data: { ...data, adminAccountId: admin.id } });
  }

  private notifyTeacher(
    session: { teacher: { name: string; gender: string | null; email: string | null; account: { email: string } | null } | null },
    subject: string,
    label: string,
    paragraphs: string[],
  ) {
    const to = session.teacher?.account?.email ?? session.teacher?.email;
    if (!to || !session.teacher) return;
    this.email
      .send({
        to,
        subject: `Nafoore Education — ${subject}`,
        html: renderNoticeEmail({
          fullName: session.teacher.name,
          gender: session.teacher.gender,
          label,
          paragraphs,
          ctaUrl: `${resolvePortalUrl('teacher')}/planning`,
          ctaLabel: 'Voir mon planning →',
        }),
      })
      .catch((error) =>
        this.logger.error(`Échec d'envoi "${subject}" à ${to}`, error instanceof Error ? error.stack : undefined),
      );
  }

  private course(session: { subject: string | null; date: Date; student: { name: string } }) {
    return `${session.subject ?? 'Séance'} avec ${session.student.name} du ${when(session.date)}`;
  }

  // Seance restee "en cours" (depart jamais pointe) : l'equipe pointe le depart.
  async close(admin: AuthenticatedAdmin, logId: string, checkoutAtRaw: string, reason: string) {
    const { log, session } = await this.loadLog(admin, logId);
    if (log.checkoutAt) throw new BadRequestException('Ce pointage est déjà clôturé');
    if (!log.checkinAt) throw new BadRequestException("Ce pointage n'a pas d'heure d'arrivée");
    const checkoutAt = new Date(checkoutAtRaw);
    this.assertTimes(log.checkinAt, checkoutAt);

    await this.prisma.attendanceLog.update({ where: { id: log.id }, data: { checkoutAt } });
    await this.applyDuration(session, log.checkinAt, checkoutAt);
    await this.record(admin, {
      action: 'cloture',
      sessionId: session.id,
      attendanceLogId: log.id,
      previousCheckinAt: log.checkinAt,
      newCheckinAt: log.checkinAt,
      newCheckoutAt: checkoutAt,
      reason,
    });
    this.notifyTeacher(session, 'Départ pointé par l’équipe', 'Pointage complété', [
      `Le départ de votre séance ${this.course(session)} n'avait pas été pointé.`,
      `L'équipe Nafoore l'a enregistré à ${hour(checkoutAt)} (arrivée : ${hour(log.checkinAt)}).`,
      `Motif : ${reason}`,
      'Pensez à rédiger le compte-rendu de la séance si ce n’est pas déjà fait.',
    ]);
    return { ok: true };
  }

  // Correction des heures d'un pointage (erreur de scan, oubli...).
  async correct(admin: AuthenticatedAdmin, logId: string, checkinRaw: string, checkoutRaw: string | undefined, reason: string) {
    const { log, session } = await this.loadLog(admin, logId);
    const checkinAt = new Date(checkinRaw);
    const checkoutAt = checkoutRaw ? new Date(checkoutRaw) : log.checkoutAt;
    this.assertTimes(checkinAt, checkoutAt);

    await this.prisma.attendanceLog.update({ where: { id: log.id }, data: { checkinAt, checkoutAt } });
    if (checkoutAt) await this.applyDuration(session, checkinAt, checkoutAt);
    await this.record(admin, {
      action: 'correction',
      sessionId: session.id,
      attendanceLogId: log.id,
      previousCheckinAt: log.checkinAt,
      previousCheckoutAt: log.checkoutAt,
      newCheckinAt: checkinAt,
      newCheckoutAt: checkoutAt,
      reason,
    });
    const before = `${log.checkinAt ? hour(log.checkinAt) : '—'} → ${log.checkoutAt ? hour(log.checkoutAt) : '—'}`;
    const after = `${hour(checkinAt)} → ${checkoutAt ? hour(checkoutAt) : '—'}`;
    this.notifyTeacher(session, 'Pointage corrigé par l’équipe', 'Pointage corrigé', [
      `L'équipe Nafoore a corrigé le pointage de votre séance ${this.course(session)}.`,
      `Avant : ${before} · Après : ${after}`,
      `Motif : ${reason}`,
    ]);
    return { ok: true };
  }

  // Seance donnee mais jamais pointee : l'equipe saisit arrivee et depart.
  async enter(admin: AuthenticatedAdmin, sessionId: string, checkinRaw: string, checkoutRaw: string, reason: string) {
    const session = await this.loadSession(admin, sessionId);
    if (session.status === 'annulee') throw new BadRequestException('Cette séance est annulée');
    if (!session.teacherId) throw new BadRequestException("Aucun enseignant n'est rattaché à cette séance");
    const existing = await this.prisma.attendanceLog.findFirst({
      where: { sessionId, verificationStatus: 'valid', checkinAt: { not: null } },
    });
    if (existing) {
      throw new BadRequestException('Cette séance a déjà un pointage : corrigez-le ou clôturez-le plutôt');
    }
    const checkinAt = new Date(checkinRaw);
    const checkoutAt = new Date(checkoutRaw);
    this.assertTimes(checkinAt, checkoutAt);

    const log = await this.prisma.attendanceLog.create({
      data: {
        sessionId,
        studentId: session.studentId,
        teacherId: session.teacherId,
        checkinAt,
        checkoutAt,
        verificationStatus: 'valid',
        method: 'admin',
      },
    });
    await this.applyDuration(session, checkinAt, checkoutAt);
    await this.record(admin, {
      action: 'saisie',
      sessionId,
      attendanceLogId: log.id,
      newCheckinAt: checkinAt,
      newCheckoutAt: checkoutAt,
      reason,
    });
    this.notifyTeacher(session, 'Séance pointée par l’équipe', 'Pointage saisi', [
      `Votre séance ${this.course(session)} n'avait pas été pointée.`,
      `L'équipe Nafoore a enregistré votre présence de ${hour(checkinAt)} à ${hour(checkoutAt)}.`,
      `Motif : ${reason}`,
      'Pensez à rédiger le compte-rendu de la séance si ce n’est pas déjà fait.',
    ]);
    return { ok: true };
  }

  // Seance passee qui n'a pas eu lieu : annulee, famille et prof prevenus.
  async notHeld(admin: AuthenticatedAdmin, sessionId: string, reason: string) {
    const session = await this.loadSession(admin, sessionId);
    if (['annulee', 'realisee'].includes(session.status)) {
      throw new BadRequestException('Cette séance est déjà clôturée ou annulée');
    }
    const pointed = await this.prisma.attendanceLog.count({
      where: { sessionId, verificationStatus: 'valid', checkinAt: { not: null } },
    });
    if (pointed > 0) {
      throw new BadRequestException('Cette séance a été pointée : elle ne peut pas être marquée non donnée');
    }
    await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        status: 'annulee',
        cancellationReason: `Séance non donnée : ${reason}`,
        changedBy: 'admin',
        changedAt: new Date(),
      },
    });
    await this.record(admin, { action: 'non_donnee', sessionId, reason });
    void this.sessionChanges.notifyAdminChange('not_held', sessionId, admin.name, reason);
    return { ok: true };
  }

  // Relance du prof : pointage ou compte-rendu manquant.
  async remind(admin: AuthenticatedAdmin, sessionId: string, kind: 'pointage' | 'compte_rendu') {
    const session = await this.loadSession(admin, sessionId);
    if (!session.teacher) throw new BadRequestException("Aucun enseignant n'est rattaché à cette séance");
    const to = session.teacher.account?.email ?? session.teacher.email;
    if (!to) throw new BadRequestException("L'enseignant n'a pas d'adresse email");
    if (kind === 'pointage') {
      this.notifyTeacher(session, 'Pointage manquant', 'Pointage manquant', [
        `Votre séance ${this.course(session)} n'a pas été pointée.`,
        "Si elle a bien eu lieu, utilisez le pointage manuel depuis votre planning (motif « QR oublié ») ou contactez l'équipe Nafoore.",
      ]);
    } else {
      this.notifyTeacher(session, 'Compte-rendu à rédiger', 'Compte-rendu manquant', [
        `Le compte-rendu de votre séance ${this.course(session)} n'a pas encore été rédigé.`,
        'La famille l’attend : merci de le compléter depuis votre planning.',
      ]);
    }
    return { ok: true, email: to };
  }

  // Scans refuses (pass suspendu, financement expire, aucune seance) sur la periode.
  async refused(admin: AuthenticatedAdmin, start: Date, end: Date) {
    const zoneWhere = await this.zone.where(admin, 'student');
    const logs = await this.prisma.attendanceLog.findMany({
      where: {
        verificationStatus: { not: 'valid' },
        createdAt: { gte: start, lt: end },
        ...(zoneWhere ? { student: zoneWhere } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
      include: {
        student: { select: { id: true, name: true } },
        teacher: { select: { id: true, name: true } },
      },
    });
    return logs.map((log) => ({
      id: log.id,
      at: log.createdAt,
      status: log.verificationStatus,
      student: log.student,
      teacher: log.teacher,
    }));
  }

  // Indicateurs : semaine et mois en cours.
  async stats(admin: AuthenticatedAdmin) {
    const zoneWhere = await this.zone.where(admin, 'student');
    const byStudent = zoneWhere ? { student: zoneWhere } : {};
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const day = (now.getDay() + 6) % 7;
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
    const from = weekStart < monthStart ? weekStart : monthStart;
    const grace = new Date(now.getTime() - GRACE_HOURS * 3_600_000);

    const [logs, pendingReports] = await Promise.all([
      this.prisma.attendanceLog.findMany({
        where: { verificationStatus: 'valid', checkinAt: { gte: from }, sessionId: { not: null }, ...byStudent },
        select: { checkinAt: true, checkoutAt: true, method: true, session: { select: { date: true } } },
      }),
      this.prisma.session.count({
        where: {
          status: { notIn: ['annulee', 'realisee'] },
          date: { lt: grace },
          attendanceLogs: { some: { checkoutAt: { not: null } } },
          ...byStudent,
        },
      }),
    ]);
    const minutes = (list: typeof logs) =>
      list
        .filter((l) => l.checkinAt && l.checkoutAt)
        .reduce((sum, l) => sum + minutesBetween(l.checkinAt as Date, l.checkoutAt as Date), 0);
    const month = logs.filter((l) => (l.checkinAt as Date) >= monthStart);
    const week = logs.filter((l) => (l.checkinAt as Date) >= weekStart);
    const late = month.filter(
      (l) => l.session && (l.checkinAt as Date).getTime() - l.session.date.getTime() > LATE_THRESHOLD_MINUTES * 60_000,
    );
    return {
      weekMinutes: minutes(week),
      monthMinutes: minutes(month),
      monthCount: month.length,
      qrShare: month.length ? Math.round((month.filter((l) => l.method === 'qr_scan').length / month.length) * 100) : null,
      lateCount: late.length,
      pendingReports,
      lateThresholdMinutes: LATE_THRESHOLD_MINUTES,
    };
  }

  // Fiabilite d'un enseignant sur 3 mois.
  async teacherReliability(admin: AuthenticatedAdmin, teacherId: string) {
    await this.zone.assertVisible(admin, 'teacher', teacherId);
    const now = new Date();
    const since = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    const grace = new Date(now.getTime() - GRACE_HOURS * 3_600_000);
    const sessions = await this.prisma.session.findMany({
      where: { teacherId, status: { not: 'annulee' }, date: { gte: since, lt: grace } },
      select: {
        date: true,
        durationMinutes: true,
        plannedDurationMinutes: true,
        status: true,
        reportedAt: true,
        attendanceLogs: {
          where: { verificationStatus: 'valid' },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { checkinAt: true, checkoutAt: true, method: true },
        },
      },
    });
    const pointed = sessions.filter((s) => s.attendanceLogs[0]?.checkinAt);
    const late = pointed.filter(
      (s) =>
        (s.attendanceLogs[0].checkinAt as Date).getTime() - s.date.getTime() > LATE_THRESHOLD_MINUTES * 60_000,
    );
    const delays = sessions
      .filter((s) => s.reportedAt)
      .map((s) => {
        const end = s.date.getTime() + (s.plannedDurationMinutes ?? s.durationMinutes) * 60_000;
        return Math.max(0, ((s.reportedAt as Date).getTime() - end) / 3_600_000);
      });
    return {
      since,
      sessions: sessions.length,
      pointed: pointed.length,
      neverPointed: sessions.length - pointed.length,
      manual: pointed.filter((s) => s.attendanceLogs[0].method !== 'qr_scan').length,
      late: late.length,
      missingReports: sessions.filter((s) => s.status !== 'realisee').length,
      avgReportDelayHours: delays.length ? Math.round((delays.reduce((a, b) => a + b, 0) / delays.length) * 10) / 10 : null,
      lateThresholdMinutes: LATE_THRESHOLD_MINUTES,
    };
  }

  // Nombre d'anomalies (30 derniers jours) : badge du menu.
  async alertCount(admin: AuthenticatedAdmin) {
    const zoneWhere = await this.zone.where(admin, 'student');
    const byStudent = zoneWhere ? { student: zoneWhere } : {};
    const now = new Date();
    const since = new Date(now.getTime() - 30 * 24 * 3_600_000);
    const grace = new Date(now.getTime() - GRACE_HOURS * 3_600_000);
    const [open, never, reports] = await Promise.all([
      this.prisma.attendanceLog.count({
        where: { checkoutAt: null, checkinAt: { not: null }, session: { date: { gte: since, lt: grace } }, ...byStudent },
      }),
      this.prisma.session.count({
        where: {
          status: { notIn: ['annulee', 'realisee', 'reportee'] },
          date: { gte: since, lt: grace },
          attendanceLogs: { none: {} },
          ...byStudent,
        },
      }),
      this.prisma.session.count({
        where: {
          status: { notIn: ['annulee', 'realisee'] },
          date: { gte: since, lt: grace },
          attendanceLogs: { some: { checkoutAt: { not: null } } },
          ...byStudent,
        },
      }),
    ]);
    return { count: open + never + reports };
  }

  // Historique des interventions de l'equipe sur des seances.
  async corrections(sessionIds: string[]) {
    if (sessionIds.length === 0) return [];
    const rows = await this.prisma.attendanceCorrection.findMany({
      where: { sessionId: { in: sessionIds } },
      orderBy: { createdAt: 'desc' },
    });
    const adminIds = [...new Set(rows.map((r) => r.adminAccountId).filter((id): id is string => Boolean(id)))];
    const admins = await this.prisma.adminAccount.findMany({ where: { id: { in: adminIds } }, select: { id: true, name: true } });
    const names = new Map(admins.map((a) => [a.id, a.name]));
    return rows.map((r) => ({ ...r, adminName: r.adminAccountId ? names.get(r.adminAccountId) ?? null : null }));
  }
}
