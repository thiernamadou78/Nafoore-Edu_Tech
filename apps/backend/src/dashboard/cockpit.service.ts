import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ZoneService } from '../auth/zone.service';
import { AuthenticatedAdmin } from '../auth/supabase-auth.guard';
import { AdminModule, hasPermission } from '../auth/permissions';

const WEEKS = 8;
const DAY_MS = 24 * 3_600_000;
const STALE_LEAD_DAYS = 3;
// Seance terminee depuis plus de ce delai sans pointage : "a pointer".
const POINTAGE_GRACE_HOURS = 2;

function and<T extends object>(base: T, zone: object | undefined): T {
  return (zone ? { AND: [base, zone] } : base) as T;
}

function startOfWeek(date: Date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

// Tableau de bord "cockpit du jour" : chiffres cles avec tendance, seances du
// jour en direct, liste "A traiter" et heures des 8 dernieres semaines — le
// tout limite a la zone du delegue et a ses droits.
@Injectable()
export class CockpitService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly zone: ZoneService,
  ) {}

  async get(admin: AuthenticatedAdmin) {
    const now = new Date();
    const [zs, zl, za, zt, zr, zren, zsup] = await Promise.all([
      this.zone.where(admin, 'student'),
      this.zone.where(admin, 'lead'),
      this.zone.where(admin, 'application'),
      this.zone.where(admin, 'teacher'),
      this.zone.where(admin, 'teacherRequest'),
      this.zone.where(admin, 'renewal'),
      this.zone.where(admin, 'supportTicket'),
    ]);
    const byStudent = zs && { student: zs };

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    // Meme moment du mois precedent (comparaison a date egale).
    const prevMonthSameDay = new Date(prevMonthStart.getTime() + (now.getTime() - monthStart.getTime()));
    const firstWeek = new Date(startOfWeek(now).getTime() - (WEEKS - 1) * 7 * DAY_MS);
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayEnd = new Date(dayStart.getTime() + DAY_MS);

    const pointedSessions = { status: 'realisee', attendanceLogs: { some: { checkoutAt: { not: null } } } };

    const [
      students,
      families,
      newStudents30d,
      teachers,
      leadsMonth,
      leadsPrevMonth,
      leadsTotal,
      leadsConverted,
      recentSessions,
      recentLeads,
      todaySessions,
    ] = await Promise.all([
      this.prisma.student.count({ where: and({ isActive: true }, zs) }),
      // Familles inscrites = leads avec un compte famille actif sur le portail.
      this.prisma.lead.count({ where: and({ portalAccount: { isNot: null } }, zl) }),
      this.prisma.student.count({ where: and({ createdAt: { gte: new Date(now.getTime() - 30 * DAY_MS) } }, zs) }),
      this.prisma.teacher.count({ where: and({ verified: true }, zt) }),
      this.prisma.lead.count({ where: and({ createdAt: { gte: monthStart } }, zl) }),
      this.prisma.lead.count({ where: and({ createdAt: { gte: prevMonthStart, lt: prevMonthSameDay } }, zl) }),
      this.prisma.lead.count({ where: and({}, zl) }),
      this.prisma.lead.count({ where: and({ status: 'converti' }, zl) }),
      this.prisma.session.findMany({
        where: and({ ...pointedSessions, date: { gte: new Date(Math.min(firstWeek.getTime(), prevMonthStart.getTime())) } }, byStudent),
        select: { date: true, durationMinutes: true },
      }),
      this.prisma.lead.findMany({
        where: and({ createdAt: { gte: firstWeek } }, zl),
        select: { createdAt: true },
      }),
      this.prisma.session.findMany({
        where: and({ date: { gte: dayStart, lt: dayEnd }, status: { not: 'annulee' } }, byStudent),
        orderBy: { date: 'asc' },
        select: {
          id: true,
          date: true,
          durationMinutes: true,
          subject: true,
          status: true,
          student: { select: { id: true, name: true } },
          teacher: { select: { id: true, name: true } },
          attendanceLogs: {
            where: { checkinAt: { not: null } },
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { checkinAt: true, checkoutAt: true },
          },
        },
      }),
    ]);

    // --- Series hebdomadaires (8 semaines) pour les mini-courbes
    const weekIndex = (date: Date) => Math.floor((startOfWeek(date).getTime() - firstWeek.getTime()) / (7 * DAY_MS));
    const hoursByWeek = Array.from({ length: WEEKS }, (_, i) => ({
      weekStart: new Date(firstWeek.getTime() + i * 7 * DAY_MS),
      minutes: 0,
    }));
    const leadsByWeek = Array(WEEKS).fill(0);
    for (const s of recentSessions) {
      const i = weekIndex(s.date);
      if (i >= 0 && i < WEEKS) hoursByWeek[i].minutes += s.durationMinutes;
    }
    for (const l of recentLeads) {
      const i = weekIndex(l.createdAt);
      if (i >= 0 && i < WEEKS) leadsByWeek[i] += 1;
    }
    const minutesMonth = recentSessions
      .filter((s) => s.date >= monthStart)
      .reduce((sum, s) => sum + s.durationMinutes, 0);
    const minutesPrevMonth = recentSessions
      .filter((s) => s.date >= prevMonthStart && s.date < prevMonthSameDay)
      .reduce((sum, s) => sum + s.durationMinutes, 0);

    // --- Seances du jour, statut en direct
    const today = todaySessions.map(({ attendanceLogs, ...session }) => {
      const log = attendanceLogs[0];
      const end = new Date(session.date.getTime() + session.durationMinutes * 60_000);
      let live: 'terminee' | 'en_cours' | 'a_venir' | 'non_pointee';
      if (session.status === 'realisee' || log?.checkoutAt) live = 'terminee';
      else if (log?.checkinAt) live = 'en_cours';
      else if (session.date > now) live = 'a_venir';
      // Heure de debut passee sans aucun pointage.
      else live = 'non_pointee';
      return { ...session, end, live, checkinAt: log?.checkinAt ?? null, checkoutAt: log?.checkoutAt ?? null };
    });

    // --- A traiter (seulement les rubriques auxquelles l'admin a acces)
    const can = (module: AdminModule) => hasPermission(admin, module);
    const count = async (module: AdminModule, fn: () => Promise<number>) => (can(module) ? fn() : null);
    const graceLimit = new Date(now.getTime() - POINTAGE_GRACE_HOURS * 3_600_000);
    const [newLeads, staleLeads, applications, requests, renewals, toPoint, missingReports, tickets] =
      await Promise.all([
        count('leads', () => this.prisma.lead.count({ where: and({ status: 'nouveau' }, zl) })),
        count('leads', () =>
          this.prisma.lead.count({
            where: and({ status: 'nouveau', createdAt: { lte: new Date(now.getTime() - STALE_LEAD_DAYS * DAY_MS) } }, zl),
          }),
        ),
        count('recruitment', () =>
          this.prisma.teacherApplication.count({ where: and({ status: { notIn: ['valide', 'refuse'] } }, za) }),
        ),
        count('teacher_requests', () => this.prisma.teacherRequest.count({ where: and({ status: 'en_attente' }, zr) })),
        count('renewals', () => this.prisma.periodRenewal.count({ where: and({ status: 'acceptee_prof' }, zren) })),
        count('attendance', () =>
          this.prisma.session.count({
            where: and(
              {
                status: { in: ['planifiee', 'confirmee'] },
                date: { gte: new Date(now.getTime() - 14 * DAY_MS), lt: graceLimit },
                attendanceLogs: { none: { checkoutAt: { not: null } } },
              },
              byStudent,
            ),
          }),
        ),
        count('attendance', () =>
          this.prisma.session.count({
            where: and(
              {
                date: { gte: new Date(now.getTime() - 14 * DAY_MS) },
                status: { not: 'annulee' },
                attendanceLogs: { some: { checkoutAt: { not: null } } },
                OR: [{ notes: null }, { notes: '' }],
              },
              byStudent,
            ),
          }),
        ),
        count('support', () => this.prisma.supportTicket.count({ where: and({ status: 'ouvert' }, zsup) })),
      ]);

    const todo = [
      { key: 'staleLeads', label: 'Leads sans réponse depuis 3 jours', count: staleLeads, path: '/leads', tone: 'red' },
      { key: 'newLeads', label: 'Nouveaux leads à traiter', count: newLeads, path: '/leads', tone: 'blue' },
      { key: 'requests', label: 'Demandes de professeur en attente', count: requests, path: '/demandes-professeur', tone: 'amber' },
      { key: 'applications', label: 'Candidatures à examiner', count: applications, path: '/recrutement', tone: 'blue' },
      { key: 'renewals', label: 'Renouvellements à confirmer', count: renewals, path: '/renouvellements', tone: 'amber' },
      { key: 'toPoint', label: 'Séances non pointées (14 j)', count: toPoint, path: '/pointages', tone: 'red' },
      { key: 'missingReports', label: 'Comptes-rendus manquants (14 j)', count: missingReports, path: '/pointages', tone: 'amber' },
      { key: 'tickets', label: 'Tickets support ouverts', count: tickets, path: '/support-tickets', tone: 'blue' },
    ].filter((item) => item.count !== null);

    return {
      kpis: {
        students: { value: students, delta: newStudents30d, deltaLabel: 'sur 30 jours' },
        teachers: { value: teachers },
        families: { value: families },
        hoursMonth: {
          value: Math.round(minutesMonth / 60),
          previous: Math.round(minutesPrevMonth / 60),
          series: hoursByWeek.map((w) => Math.round(w.minutes / 60)),
        },
        leadsMonth: { value: leadsMonth, previous: leadsPrevMonth, series: leadsByWeek },
        conversionRate: leadsTotal > 0 ? leadsConverted / leadsTotal : 0,
      },
      today,
      todo,
      hoursByWeek: hoursByWeek.map((w) => ({ weekStart: w.weekStart, hours: Math.round((w.minutes / 60) * 10) / 10 })),
    };
  }
}
