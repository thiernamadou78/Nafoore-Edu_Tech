import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const STALE_LEAD_DAYS = 3;

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

  async getNotifications() {
    const [leadsCount, leads, applicationsCount, applications, requestsCount, requests] =
      await Promise.all([
        this.prisma.lead.count({ where: { status: 'nouveau' } }),
        this.prisma.lead.findMany({
          where: { status: 'nouveau' },
          select: { id: true, name: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
        this.prisma.teacherApplication.count({
          where: { status: { notIn: ['valide', 'refuse'] } },
        }),
        this.prisma.teacherApplication.findMany({
          where: { status: { notIn: ['valide', 'refuse'] } },
          select: { id: true, candidateName: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
        this.prisma.teacherRequest.count({ where: { status: 'en_attente' } }),
        this.prisma.teacherRequest.findMany({
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
