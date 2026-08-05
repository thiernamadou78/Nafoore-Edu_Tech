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
      leadsThisMonth,
      totalLeads,
      convertedLeads,
      studentsWithLead,
      staleLeads,
      pendingApplications,
    ] = await Promise.all([
      this.prisma.student.count(),
      this.prisma.lead.count({ where: { createdAt: { gte: startOfMonth } } }),
      this.prisma.lead.count(),
      this.prisma.lead.count({ where: { status: 'converti' } }),
      this.prisma.student.findMany({
        include: { parentLead: { select: { profile: true } } },
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

    const studentsByProfile = studentsWithLead.reduce(
      (acc, student) => {
        const profile = student.parentLead?.profile ?? 'autre';
        acc[profile] = (acc[profile] ?? 0) + 1;
        return acc;
      },
      {
        famille: 0,
        mairie: 0,
        entreprise: 0,
        centre_formation_ecole_pro: 0,
        autre: 0,
      } as Record<string, number>,
    );

    return {
      activeStudents,
      leadsThisMonth,
      conversionRate: totalLeads > 0 ? convertedLeads / totalLeads : 0,
      studentsByProfile,
      alerts: {
        staleLeads,
        pendingTeacherApplications: pendingApplications,
      },
    };
  }
}
