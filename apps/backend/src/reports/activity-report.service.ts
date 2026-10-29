import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { AdminNotificationService } from '../email/admin-notification.service';
import { resolvePortalUrl } from '../email/portal-url.util';
import { formatInPlatformTz, zonedParts, zonedTimeToUtc } from '../common/timezone';
import { LATE_THRESHOLD_MINUTES } from '../attendance-admin/attendance-admin.service';
import { LATE_CHANGE_HOURS } from '../session-changes/session-changes.service';
import { renderActivityReportEmail } from './activity-report.template';

export type ReportKind = 'weekly' | 'monthly';
// Intervalle libre choisi dans la page Rapports (jamais envoye par email).
export type ReportView = ReportKind | 'custom';

// Une seance passee n'est comptee "non pointee" / "sans compte-rendu"
// qu'apres ce delai (meme regle que le suivi des pointages).
const GRACE_HOURS = 2;
// Le rapport part a partir de 7 h, le lundi (hebdo) ou le 1er (mensuel) ;
// rattrapage le lendemain si le serveur etait arrete.
const SEND_HOUR = 7;
const RENEWAL_DAYS = 14;
const INACTIVE_DAYS = 14;
const PENDING_REQUEST_DAYS = 7;

const minutesBetween = (from: Date, to: Date) => Math.max(1, Math.round((to.getTime() - from.getTime()) / 60000));
const round1 = (n: number) => Math.round(n * 10) / 10;
const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
const pct = (part: number, total: number) => (total ? Math.round((part / total) * 100) : null);
const DAY = 86_400_000;

export function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m ? `${h} h ${String(m).padStart(2, '0')} min` : `${h} h`;
}

// Periode (dans le fuseau de la plateforme) contenant `anchor` : semaine du
// lundi au dimanche, ou mois civil.
export function periodOf(kind: ReportKind, anchor: Date) {
  const p = zonedParts(anchor);
  if (kind === 'weekly') {
    const start = zonedTimeToUtc(p.year, p.month, p.day - (p.weekday - 1), 0, 0);
    const end = zonedTimeToUtc(p.year, p.month, p.day - (p.weekday - 1) + 7, 0, 0);
    return { start, end };
  }
  return { start: zonedTimeToUtc(p.year, p.month, 1, 0, 0), end: zonedTimeToUtc(p.year, p.month + 1, 1, 0, 0) };
}

export function periodLabel(kind: ReportView, start: Date, end: Date) {
  if (kind === 'custom') {
    const last = new Date(end.getTime() - DAY / 2);
    return `Du ${formatInPlatformTz(start, { day: 'numeric', month: 'long', year: 'numeric' })} au ${formatInPlatformTz(last, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })}`;
  }
  if (kind === 'monthly') {
    const label = formatInPlatformTz(start, { month: 'long', year: 'numeric' });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }
  const last = new Date(end.getTime() - DAY / 2);
  return `Semaine du ${formatInPlatformTz(start, { day: 'numeric', month: 'long' })} au ${formatInPlatformTz(last, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })}`;
}

const sessionSelect = {
  id: true,
  date: true,
  status: true,
  durationMinutes: true,
  plannedDurationMinutes: true,
  reportedAt: true,
  changedAt: true,
  cancellationReason: true,
  rescheduledFrom: true,
  teacher: { select: { id: true, name: true } },
  student: {
    select: {
      id: true,
      name: true,
      parentLead: { select: { id: true, name: true, portalAccount: { select: { familyName: true } } } },
    },
  },
  attendanceLogs: {
    where: { verificationStatus: 'valid', checkinAt: { not: null } },
    orderBy: { createdAt: 'desc' as const },
    take: 1,
    select: { checkinAt: true, checkoutAt: true, method: true },
  },
} satisfies Prisma.SessionSelect;

type ReportSession = Prisma.SessionGetPayload<{ select: typeof sessionSelect }>;

export interface Row {
  id: string;
  name: string;
  minutes: number;
  sessions: number;
}

// Rapport d'activite (hebdomadaire / mensuel) pour l'equipe Nafoore :
// seances, pointages, comptes-rendus, profs, familles, recrutement, avis et
// progression, compares a la periode precedente.
@Injectable()
export class ActivityReportService {
  private readonly logger = new Logger(ActivityReportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly adminNotification: AdminNotificationService,
  ) {}

  // Indicateurs d'une periode sur les seances (date prevue dans la periode).
  private async metrics(start: Date, end: Date, now: Date) {
    const sessions = await this.prisma.session.findMany({
      where: { date: { gte: start, lt: end } },
      select: sessionSelect,
    });
    const graceLimit = now.getTime() - GRACE_HOURS * 3_600_000;
    const endOf = (s: ReportSession) => s.date.getTime() + (s.plannedDurationMinutes ?? s.durationMinutes) * 60_000;
    const notHeld = sessions.filter((s) => s.status === 'annulee' && s.cancellationReason?.startsWith('Séance non donnée'));
    const cancelled = sessions.filter((s) => s.status === 'annulee' && !notHeld.includes(s));
    const lateCancelled = cancelled.filter(
      (s) => s.changedAt && s.date.getTime() - s.changedAt.getTime() < LATE_CHANGE_HOURS * 3_600_000,
    );
    const postponed = sessions.filter((s) => s.status === 'reportee' || s.rescheduledFrom);
    // Seances qui devaient avoir lieu (passees, ni annulees ni reportees).
    const due = sessions.filter(
      (s) => !['annulee', 'reportee'].includes(s.status) && s.teacher && endOf(s) <= graceLimit,
    );
    const pointed = sessions.filter((s) => s.status !== 'annulee' && s.attendanceLogs[0]);
    const neverPointed = due.filter((s) => !s.attendanceLogs[0]);
    const completed = pointed.filter((s) => s.attendanceLogs[0].checkoutAt);
    const openCheckouts = pointed.filter((s) => !s.attendanceLogs[0].checkoutAt && endOf(s) <= graceLimit);
    const minutesOf = (s: ReportSession) =>
      minutesBetween(s.attendanceLogs[0].checkinAt as Date, s.attendanceLogs[0].checkoutAt as Date);
    const late = pointed.filter(
      (s) => (s.attendanceLogs[0].checkinAt as Date).getTime() - s.date.getTime() > LATE_THRESHOLD_MINUTES * 60_000,
    );
    const missingReports = pointed.filter((s) => s.status !== 'realisee' && endOf(s) <= graceLimit);
    const delays = sessions
      .filter((s) => s.reportedAt)
      .map((s) => Math.max(0, ((s.reportedAt as Date).getTime() - endOf(s)) / 3_600_000));

    // Par enseignant et par famille.
    const teachers = new Map<string, Row & { neverPointed: number; late: number; missingReports: number }>();
    const families = new Map<string, Row>();
    const teacherRow = (t: { id: string; name: string }) => {
      if (!teachers.has(t.id)) teachers.set(t.id, { id: t.id, name: t.name, minutes: 0, sessions: 0, neverPointed: 0, late: 0, missingReports: 0 });
      return teachers.get(t.id)!;
    };
    for (const s of completed) {
      const minutes = minutesOf(s);
      if (s.teacher) {
        const row = teacherRow(s.teacher);
        row.minutes += minutes;
        row.sessions += 1;
      }
      const lead = s.student.parentLead;
      const key = lead?.id ?? `eleve:${s.student.id}`;
      const name = lead ? lead.portalAccount?.familyName || lead.name : s.student.name;
      const family = families.get(key) ?? { id: lead?.id ?? s.student.id, name, minutes: 0, sessions: 0 };
      family.minutes += minutes;
      family.sessions += 1;
      families.set(key, family);
    }
    for (const s of neverPointed) if (s.teacher) teacherRow(s.teacher).neverPointed += 1;
    for (const s of late) if (s.teacher) teacherRow(s.teacher).late += 1;
    for (const s of missingReports) if (s.teacher) teacherRow(s.teacher).missingReports += 1;

    const [newStudents, newLeads, newApplications, reviews] = await Promise.all([
      this.prisma.student.findMany({
        where: { createdAt: { gte: start, lt: end } },
        select: { id: true, name: true },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.lead.count({ where: { createdAt: { gte: start, lt: end } } }),
      this.prisma.teacherApplication.count({ where: { createdAt: { gte: start, lt: end } } }),
      this.prisma.teacherReview.findMany({
        where: { createdAt: { gte: start, lt: end } },
        select: { rating: true, comment: true, studentName: true, teacher: { select: { id: true, name: true } } },
      }),
    ]);

    return {
      planned: sessions.length,
      done: pointed.length,
      minutes: completed.reduce((sum, s) => sum + minutesOf(s), 0),
      cancelled: cancelled.length,
      lateCancelled: lateCancelled.length,
      postponed: postponed.length,
      notHeld: notHeld.length,
      due: due.length,
      neverPointed: neverPointed.length,
      openCheckouts: openCheckouts.length,
      pointingRate: pct(due.length - neverPointed.length, due.length),
      qrShare: pct(pointed.filter((s) => s.attendanceLogs[0].method === 'qr_scan').length, pointed.length),
      late: late.length,
      missingReports: missingReports.length,
      avgReportDelayHours: delays.length ? round1(mean(delays)) : null,
      newStudents,
      newLeads,
      newApplications,
      reviews,
      teachers: [...teachers.values()].sort((a, b) => b.minutes - a.minutes),
      families: [...families.values()].sort((a, b) => b.minutes - a.minutes),
    };
  }

  // Evolution des notes : moyenne des notes de suivi de la periode comparee
  // aux notes de depart, par eleve et par matiere.
  private async progression(start: Date, end: Date) {
    const recent = await this.prisma.grade.findMany({
      where: { kind: 'suivi', evaluatedAt: { gte: start, lt: end } },
      select: { studentId: true, subject: true, value: true, scale: true, student: { select: { name: true } } },
    });
    if (recent.length === 0) return { up: [], down: [] };
    const baselines = await this.prisma.grade.findMany({
      where: { kind: 'depart', studentId: { in: [...new Set(recent.map((g) => g.studentId))] } },
      select: { studentId: true, subject: true, value: true, scale: true },
    });
    const on20 = (g: { value: number; scale: number }) => (g.value / (g.scale || 20)) * 20;
    const groups = new Map<string, { studentId: string; studentName: string; subject: string; values: number[] }>();
    for (const g of recent) {
      const key = `${g.studentId}|${g.subject}`;
      const entry = groups.get(key) ?? { studentId: g.studentId, studentName: g.student.name, subject: g.subject, values: [] };
      entry.values.push(on20(g));
      groups.set(key, entry);
    }
    const rows = [...groups.values()]
      .map((g) => {
        const base = baselines.filter((b) => b.studentId === g.studentId && b.subject === g.subject).map(on20);
        if (base.length === 0) return null;
        const baseline = round1(mean(base));
        const latest = round1(mean(g.values));
        return { studentId: g.studentId, studentName: g.studentName, subject: g.subject, baseline, latest, delta: round1(latest - baseline) };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);
    return {
      up: rows.filter((r) => r.delta >= 1).sort((a, b) => b.delta - a.delta).slice(0, 5),
      down: rows.filter((r) => r.delta <= -1).sort((a, b) => a.delta - b.delta).slice(0, 5),
    };
  }

  async build(kind: ReportKind, anchor: Date, now = new Date()) {
    const { start, end } = periodOf(kind, anchor);
    return this.assemble(kind, start, end, periodOf(kind, new Date(start.getTime() - DAY / 2)), now);
  }

  // Intervalle libre : compare a la periode de meme duree juste avant.
  buildRange(start: Date, end: Date, now = new Date()) {
    const length = end.getTime() - start.getTime();
    return this.assemble('custom', start, end, { start: new Date(start.getTime() - length), end: start }, now);
  }

  private async assemble(kind: ReportView, start: Date, end: Date, previous: { start: Date; end: Date }, now: Date) {
    const [current, before, progression, renewalsDue, activeAssignments, pendingRequests, dossiersToValidate, sent] =
      await Promise.all([
        this.metrics(start, end, now),
        this.metrics(previous.start, previous.end, now),
        this.progression(start, end),
        this.prisma.studentTeacher.findMany({
          where: { endsAt: { gte: now, lt: new Date(now.getTime() + RENEWAL_DAYS * DAY) }, student: { isActive: true } },
          select: { endsAt: true, subject: true, student: { select: { id: true, name: true } }, teacher: { select: { name: true } } },
          orderBy: { endsAt: 'asc' },
        }),
        this.prisma.studentTeacher.findMany({
          where: { OR: [{ endsAt: null }, { endsAt: { gte: now } }], student: { isActive: true } },
          select: { student: { select: { id: true, name: true } } },
        }),
        this.prisma.teacherRequest.findMany({
          where: { status: 'en_attente', createdAt: { lt: new Date(now.getTime() - PENDING_REQUEST_DAYS * DAY) } },
          select: { id: true, subject: true, createdAt: true, student: { select: { name: true } } },
          orderBy: { createdAt: 'asc' },
        }),
        this.prisma.teacherApplication.count({ where: { status: 'dossier_complete' } }),
        kind === 'custom'
          ? null
          : this.prisma.activityReport.findUnique({ where: { kind_periodStart: { kind, periodStart: start } } }),
      ]);

    // Eleves suivis sans seance (ni passee ni prevue) depuis 2 semaines.
    const studentIds = [...new Set(activeAssignments.map((a) => a.student.id))];
    const recentSessions = await this.prisma.session.findMany({
      where: { studentId: { in: studentIds }, status: { not: 'annulee' }, date: { gte: new Date(now.getTime() - INACTIVE_DAYS * DAY) } },
      select: { studentId: true },
      distinct: ['studentId'],
    });
    const active = new Set(recentSessions.map((s) => s.studentId));
    const lastSessions = await this.prisma.session.groupBy({
      by: ['studentId'],
      where: { studentId: { in: studentIds.filter((id) => !active.has(id)) }, status: { not: 'annulee' } },
      _max: { date: true },
    });
    const lastById = new Map(lastSessions.map((s) => [s.studentId, s._max.date]));
    const inactive = activeAssignments
      .map((a) => a.student)
      .filter((s, i, list) => !active.has(s.id) && list.findIndex((x) => x.id === s.id) === i)
      .map((s) => ({ id: s.id, name: s.name, lastSession: lastById.get(s.id) ?? null }));

    // Profs a surveiller : oublis de pointage, retards, comptes-rendus en
    // retard, avis de 2/5 ou moins sur la periode.
    const lowReviews = current.reviews.filter((r) => r.rating <= 2);
    const watch = new Map<string, { id: string; name: string; reasons: string[] }>();
    const flag = (t: { id: string; name: string }, reason: string) => {
      const entry = watch.get(t.id) ?? { id: t.id, name: t.name, reasons: [] };
      entry.reasons.push(reason);
      watch.set(t.id, entry);
    };
    const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`;
    for (const t of current.teachers) {
      if (t.neverPointed) flag(t, `${plural(t.neverPointed, 'séance')} non pointée${t.neverPointed > 1 ? 's' : ''}`);
      if (t.late >= 2) flag(t, plural(t.late, 'retard'));
      if (t.missingReports) flag(t, `${plural(t.missingReports, 'compte-rendu')} manquant${t.missingReports > 1 ? 's' : ''}`.replace('compte-rendus', 'comptes-rendus'));
    }
    for (const r of lowReviews) flag(r.teacher, `avis ${r.rating}/5`);

    const ratings = current.reviews.map((r) => r.rating);
    const prevRatings = before.reviews.map((r) => r.rating);
    const kpi = (value: number | null, prev: number | null) => ({ value, previous: prev });
    return {
      kind,
      label: periodLabel(kind, start, end),
      start,
      end,
      previousLabel: periodLabel(kind, previous.start, previous.end),
      generatedAt: now,
      sentAt: sent?.sentAt ?? null,
      lateThresholdMinutes: LATE_THRESHOLD_MINUTES,
      lateChangeHours: LATE_CHANGE_HOURS,
      kpis: {
        minutes: kpi(current.minutes, before.minutes),
        done: kpi(current.done, before.done),
        cancelled: kpi(current.cancelled + current.notHeld, before.cancelled + before.notHeld),
        pointingRate: kpi(current.pointingRate, before.pointingRate),
        missingReports: kpi(current.missingReports, before.missingReports),
        newStudents: kpi(current.newStudents.length, before.newStudents.length),
      },
      activity: {
        planned: current.planned,
        done: current.done,
        cancelled: current.cancelled,
        lateCancelled: current.lateCancelled,
        postponed: current.postponed,
        notHeld: current.notHeld,
        minutes: current.minutes,
      },
      quality: {
        pointingRate: current.pointingRate,
        neverPointed: current.neverPointed,
        openCheckouts: current.openCheckouts,
        qrShare: current.qrShare,
        late: current.late,
        missingReports: current.missingReports,
        avgReportDelayHours: current.avgReportDelayHours,
      },
      teachers: {
        all: current.teachers.map(({ id, name, minutes, sessions }) => ({ id, name, minutes, sessions })),
        top: current.teachers.filter((t) => t.minutes > 0).slice(0, 5).map(({ id, name, minutes, sessions }) => ({ id, name, minutes, sessions })),
        watch: [...watch.values()],
      },
      families: {
        all: current.families,
        newStudents: current.newStudents,
        renewalsDue: renewalsDue.map((r) => ({
          studentId: r.student.id,
          studentName: r.student.name,
          teacherName: r.teacher.name,
          subject: r.subject,
          endsAt: r.endsAt,
        })),
        inactive,
      },
      recruitment: {
        newLeads: current.newLeads,
        newApplications: current.newApplications,
        dossiersToValidate,
        pendingRequests: pendingRequests.map((r) => ({
          id: r.id,
          studentName: r.student.name,
          subject: r.subject,
          days: Math.floor((now.getTime() - r.createdAt.getTime()) / DAY),
        })),
      },
      reviews: {
        count: ratings.length,
        average: ratings.length ? round1(mean(ratings)) : null,
        previousAverage: prevRatings.length ? round1(mean(prevRatings)) : null,
        low: lowReviews.map((r) => ({ teacherName: r.teacher.name, studentName: r.studentName, rating: r.rating, comment: r.comment })),
      },
      progression,
    };
  }

  // Heures par enseignant et par famille (piece jointe du rapport mensuel et
  // export de la page Rapports).
  toCsv(report: Awaited<ReturnType<ActivityReportService['build']>>) {
    const cell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const row = (type: string, r: { name: string; sessions: number; minutes: number }) =>
      [type, r.name, r.sessions, (r.minutes / 60).toFixed(2).replace('.', ','), formatDuration(r.minutes)].map(cell).join(';');
    const lines = [
      ['Type', 'Nom', 'Séances pointées', 'Heures (décimal)', 'Durée'].map(cell).join(';'),
      ...report.teachers.all.filter((t) => t.sessions > 0).map((t) => row('Enseignant', t)),
      ...report.families.all.map((f) => row('Famille', f)),
    ];
    return '﻿' + lines.join('\r\n');
  }

  // Tous les jours a l'heure pile : envoie les rapports dus (lundi pour la
  // semaine ecoulee, 1er du mois pour le mois ecoule), avec un jour de
  // rattrapage. La ligne activity_reports est creee AVANT l'envoi : jamais
  // deux envois pour la meme periode, meme apres un redemarrage.
  @Cron('0 * * * *')
  async sendDueReports() {
    const now = new Date();
    const p = zonedParts(now);
    if (p.hour < SEND_HOUR) return;
    if (p.weekday === 1 || p.weekday === 2) await this.sendOnce('weekly', now);
    if (p.day === 1 || p.day === 2) await this.sendOnce('monthly', now);
  }

  private async sendOnce(kind: ReportKind, now: Date) {
    const { start: currentStart } = periodOf(kind, now);
    const { start, end } = periodOf(kind, new Date(currentStart.getTime() - DAY / 2));
    try {
      await this.prisma.activityReport.create({ data: { kind, periodStart: start, periodEnd: end } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return;
      throw error;
    }
    try {
      await this.send(kind, start, now);
      await this.prisma.activityReport.update({
        where: { kind_periodStart: { kind, periodStart: start } },
        data: { sentAt: new Date() },
      });
    } catch (error) {
      this.logger.error(`Échec du rapport ${kind} ${start.toISOString()}`, error instanceof Error ? error.stack : undefined);
    }
  }

  async send(kind: ReportKind, anchor: Date, now = new Date()) {
    const report = await this.build(kind, anchor, now);
    const html = renderActivityReportEmail(report, `${resolvePortalUrl('admin')}/rapports`);
    const subject = `[Admin] Rapport ${kind === 'weekly' ? 'hebdomadaire' : 'mensuel'} — ${report.label}`;
    const attachments =
      kind === 'monthly'
        ? [{ filename: `nafoore-heures-${report.start.toISOString().slice(0, 7)}.csv`, content: this.toCsv(report) }]
        : undefined;
    for (const to of this.adminNotification.recipients()) {
      await this.email.send({ to, subject, html, attachments });
    }
    this.logger.log(`Rapport ${kind} envoyé : ${report.label}`);
  }

  parseAnchor(raw?: string, hour = 12) {
    if (!raw) return null;
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
    if (!match) throw new BadRequestException('Date invalide');
    return zonedTimeToUtc(Number(match[1]), Number(match[2]), Number(match[3]), hour, 0);
  }

  // Intervalle "du ... au ..." (jours inclus), au plus un an.
  parseRange(from?: string, to?: string) {
    const start = this.parseAnchor(from, 0);
    const lastDay = this.parseAnchor(to, 0);
    if (!start || !lastDay) throw new BadRequestException("Choisissez les dates de début et de fin de l'intervalle");
    const p = zonedParts(new Date(lastDay.getTime() + 3_600_000));
    const end = zonedTimeToUtc(p.year, p.month, p.day + 1, 0, 0);
    if (end <= start) throw new BadRequestException('La date de fin doit être après la date de début');
    if (end.getTime() - start.getTime() > 367 * DAY) throw new BadRequestException("L'intervalle ne peut pas dépasser un an");
    return { start, end };
  }

  // Periode affichee par defaut : la derniere periode terminee.
  defaultAnchor(kind: ReportKind, now = new Date()) {
    return new Date(periodOf(kind, now).start.getTime() - DAY / 2);
  }
}
