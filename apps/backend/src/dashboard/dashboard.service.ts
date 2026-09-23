import { AuthenticatedAdmin } from '../auth/supabase-auth.guard';
import { hasPermission } from '../auth/permissions';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const STALE_LEAD_DAYS = 3;
// Delai de grace apres l'horaire prevu avant de considerer une seance comme
// "a surveiller" : laisse le temps normal au prof de pointer/rediger sans
// remonter du bruit pour des seances tout juste terminees.
const ATTENDANCE_ALERT_GRACE_HOURS = 2;

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const staleThreshold = new Date(
      now.getTime() - STALE_LEAD_DAYS * 24 * 60 * 60 * 1000,
    );

    const [
      activeStudents,
      activeTeachers,
      leadsThisMonth,
      totalLeads,
      convertedLeads,
      minutesTaught,
      staleLeads,
      pendingApplications,
    ] = await Promise.all([
      this.prisma.student.count(),
      this.prisma.teacher.count({ where: { verified: true } }),
      this.prisma.lead.count({ where: { createdAt: { gte: startOfMonth } } }),
      this.prisma.lead.count(),
      this.prisma.lead.count({ where: { status: 'converti' } }),
      // Ne compte que les seances avec un pointage de fin confirme (meme
      // convention que totalMinutesRealized cote portail enseignant/famille).
      this.prisma.session.aggregate({
        where: { status: 'realisee', attendanceLogs: { some: { checkoutAt: { not: null } } } },
        _sum: { durationMinutes: true },
      }),
      this.prisma.lead.findMany({
        where: { status: 'nouveau', createdAt: { lte: staleThreshold } },
        select: { id: true, name: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.teacherApplication.findMany({
        where: { status: { notIn: ['valide', 'refuse'] } },
        select: { id: true, candidateName: true, status: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    return {
      activeStudents,
      activeTeachers,
      totalHoursTaught: Math.round((minutesTaught._sum.durationMinutes ?? 0) / 60),
      leadsThisMonth,
      conversionRate: totalLeads > 0 ? convertedLeads / totalLeads : 0,
      alerts: {
        staleLeads,
        pendingTeacherApplications: pendingApplications,
      },
    };
  }

  async getMapData() {
    const [students, teachers] = await Promise.all([
      this.prisma.student.findMany({
        where: { latitude: { not: null }, longitude: { not: null } },
        select: { id: true, name: true, address: true, latitude: true, longitude: true },
      }),
      this.prisma.teacher.findMany({
        where: { latitude: { not: null }, longitude: { not: null } },
        select: { id: true, name: true, address: true, latitude: true, longitude: true },
      }),
    ]);

    return { students, teachers };
  }

  // Vue de suivi pour l'admin : trois familles de séances qui indiquent un
  // pointage QR/compte-rendu qui a mal tourné ou n'a jamais eu lieu — aucune
  // de ces situations n'était visible auparavant en dehors de la fiche élève
  // consultée une par une.
  async getAttendanceAlerts() {
    const now = new Date();
    const graceThreshold = new Date(now.getTime() - ATTENDANCE_ALERT_GRACE_HOURS * 3_600_000);

    const weekAgo = new Date(now.getTime() - 7 * 24 * 3_600_000);

    const [openLogs, recentLogs, pastSessions] = await Promise.all([
      // Check-in scanné mais jamais de check-out : séance restée "en cours".
      this.prisma.attendanceLog.findMany({
        where: { checkoutAt: null, sessionId: { not: null }, checkinAt: { not: null } },
        include: {
          student: { select: { id: true, name: true } },
          teacher: { select: { id: true, name: true } },
          session: { select: { date: true, durationMinutes: true, subject: true } },
        },
        orderBy: { checkinAt: 'asc' },
      }),
      // Journal des pointages de la semaine (les normaux comme les anormaux) :
      // sans lui, un pointage sans souci n'apparaissait nulle part.
      this.prisma.attendanceLog.findMany({
        where: {
          verificationStatus: 'valid',
          checkinAt: { not: null, gte: weekAgo },
          sessionId: { not: null },
        },
        orderBy: { checkinAt: 'desc' },
        take: 50,
        include: {
          student: { select: { id: true, name: true } },
          teacher: { select: { id: true, name: true } },
          session: {
            select: { date: true, durationMinutes: true, subject: true, status: true, notes: true },
          },
        },
      }),
      // Toutes les séances passées non annulées : on classe en mémoire car le
      // critère "jamais pointée" / "compte-rendu manquant" combine plusieurs
      // colonnes (statut, notes, présence d'un pointage clôturé, date).
      this.prisma.session.findMany({
        where: { status: { not: 'annulee' }, date: { lt: now } },
        select: {
          id: true,
          date: true,
          durationMinutes: true,
          subject: true,
          status: true,
          notes: true,
          student: { select: { id: true, name: true } },
          teacher: { select: { id: true, name: true } },
          // Le pointage (QR/manuel) ne clôture plus automatiquement la séance
          // (voir AttendanceService) : on a donc besoin de savoir si un
          // pointage a bien eu lieu ET s'il est clôturé, pour distinguer
          // "jamais pointée" de "pointée mais jamais rapportée".
          attendanceLogs: {
            select: { checkoutAt: true },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      }),
    ]);

    const staleOpenSessions = openLogs
      .filter((log) => log.session && log.session.date < graceThreshold)
      .map((log) => ({
        attendanceLogId: log.id,
        student: log.student,
        teacher: log.teacher,
        subject: log.session?.subject ?? null,
        scheduledDate: log.session?.date ?? null,
        checkinAt: log.checkinAt,
      }));

    const neverPointedSessions = pastSessions
      .filter(
        (session) =>
          session.status !== 'realisee' &&
          session.attendanceLogs.length === 0 &&
          session.date < graceThreshold,
      )
      .map(({ attendanceLogs, ...session }) => session);

    const missingReports = pastSessions
      .filter((session) => {
        const lastLog = session.attendanceLogs[0];
        const hasOpenAttendance = lastLog && !lastLog.checkoutAt;
        if (hasOpenAttendance) return false; // déjà couvert par staleOpenSessions

        const realiseeSansNotes = session.status === 'realisee' && !session.notes?.trim();
        const pointeeSansRapport =
          session.status !== 'realisee' &&
          Boolean(lastLog?.checkoutAt) &&
          session.date < graceThreshold;
        return realiseeSansNotes || pointeeSansRapport;
      })
      .map(({ attendanceLogs, ...session }) => session);

    const recentPointages = recentLogs.map((log) => ({
      id: log.id,
      student: log.student,
      teacher: log.teacher,
      subject: log.session?.subject ?? null,
      scheduledDate: log.session?.date ?? null,
      durationMinutes: log.session?.durationMinutes ?? null,
      checkinAt: log.checkinAt,
      checkoutAt: log.checkoutAt,
      method: log.method,
      sessionStatus: log.session?.status ?? null,
      hasReport: Boolean(log.session?.notes?.trim()),
    }));

    return { staleOpenSessions, neverPointedSessions, missingReports, recentPointages };
  }

  async getNotifications(admin: AuthenticatedAdmin) {
    const canLeads = hasPermission(admin, 'leads');
    const canRecruitment = hasPermission(admin, 'recruitment');
    const canRequests = hasPermission(admin, 'teacher_requests');
    const none = Promise.resolve(0);
    const noItems = Promise.resolve([]);
    const [leadsCount, leads, applicationsCount, applications, requestsCount, requests] =
      await Promise.all([
        canLeads ? this.prisma.lead.count({ where: { status: 'nouveau' } }) : none,
        !canLeads ? noItems : this.prisma.lead.findMany({
          where: { status: 'nouveau' },
          select: { id: true, name: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
        !canRecruitment ? none : this.prisma.teacherApplication.count({
          where: { status: { notIn: ['valide', 'refuse'] } },
        }),
        !canRecruitment ? noItems : this.prisma.teacherApplication.findMany({
          where: { status: { notIn: ['valide', 'refuse'] } },
          select: { id: true, candidateName: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
        canRequests ? this.prisma.teacherRequest.count({ where: { status: 'en_attente' } }) : none,
        !canRequests ? noItems : this.prisma.teacherRequest.findMany({
          where: { status: 'en_attente' },
          select: {
            id: true,
            subject: true,
            createdAt: true,
            student: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
      ]);

    return {
      total: leadsCount + applicationsCount + requestsCount,
      leads: {
        count: leadsCount,
        items: leads.map((lead) => ({ id: lead.id, label: lead.name, createdAt: lead.createdAt })),
      },
      teacherApplications: {
        count: applicationsCount,
        items: applications.map((application) => ({
          id: application.id,
          label: application.candidateName,
          createdAt: application.createdAt,
        })),
      },
      teacherRequests: {
        count: requestsCount,
        items: requests.map((request) => ({
          id: request.id,
          label: `${request.student.name} — ${request.subject}`,
          createdAt: request.createdAt,
        })),
      },
    };
  }
}
