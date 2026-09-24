import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ZoneService } from '../auth/zone.service';
import { AuthenticatedAdmin } from '../auth/supabase-auth.guard';

@Injectable()
export class PlanningService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly zone: ZoneService,
  ) {}

  async list(
    admin: AuthenticatedAdmin,
    filters: { from: Date; to: Date; teacherId?: string; studentId?: string; status?: string },
  ) {
    const zoneWhere = await this.zone.where(admin, 'student');
    const where: Prisma.SessionWhereInput = {
      date: { gte: filters.from, lt: filters.to },
      teacherId: filters.teacherId,
      studentId: filters.studentId,
      status: filters.status,
      ...(zoneWhere ? { student: zoneWhere } : {}),
    };

    const sessions = await this.prisma.session.findMany({
      where,
      orderBy: { date: 'asc' },
      select: {
        id: true,
        date: true,
        durationMinutes: true,
        subject: true,
        status: true,
        notes: true,
        student: { select: { id: true, name: true, level: true, classe: true } },
        teacher: { select: { id: true, name: true } },
        attendanceLogs: {
          where: { checkinAt: { not: null } },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { checkinAt: true, checkoutAt: true, method: true },
        },
      },
    });

    return sessions.map(({ notes, attendanceLogs, ...session }) => ({
      ...session,
      hasReport: Boolean(notes?.trim()),
      checkinAt: attendanceLogs[0]?.checkinAt ?? null,
      checkoutAt: attendanceLogs[0]?.checkoutAt ?? null,
      pointage: attendanceLogs[0]?.method ?? null,
    }));
  }
}
