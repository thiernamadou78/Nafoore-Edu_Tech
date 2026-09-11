import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ManualAttendanceDto } from './dto/manual-attendance.dto';
import { ScanAttendanceDto } from './dto/scan-attendance.dto';
import { ConfirmEarlyCheckoutDto } from './dto/confirm-early-checkout.dto';

const SCAN_WINDOW_MINUTES = 30;
const SESSION_LOOKUP_WINDOW_HOURS = 6;
// En dessous de ce seuil entre check-in et re-scan, on considère que c'est la
// même caméra qui a recapturé le QR par accident (famille pas encore rangé le
// pass) plutôt qu'un vrai check-out — évite de clôturer une séance de 1 minute.
const MIN_MINUTES_BEFORE_CHECKOUT = 3;

export interface ScanResult {
  verificationStatus: 'valid' | 'pass_revoked' | 'funding_expired' | 'no_session_found';
  action: 'checkin' | 'checkout' | 'checkout_confirm_required' | null;
  student: { id: string; name: string } | null;
  durationMinutes?: number;
  alreadyCheckedIn?: boolean;
  nearestSessionAt?: Date | null;
  remainingMinutes?: number;
  sessionId?: string;
}

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  async scan(teacherId: string, dto: ScanAttendanceDto): Promise<ScanResult> {
    const student = await this.prisma.student.findUnique({ where: { qrToken: dto.qrToken } });
    if (!student) {
      // Token inconnu : rien à journaliser (pas de studentId valide pour la FK).
      return { verificationStatus: 'pass_revoked', action: null, student: null };
    }

    const studentSummary = { id: student.id, name: student.name };

    if (student.passStatus !== 'active') {
      await this.logBlocked(student.id, teacherId, 'pass_revoked');
      return { verificationStatus: 'pass_revoked', action: null, student: studentSummary };
    }

    if (await this.hasExpiredFunding(student.id)) {
      await this.logBlocked(student.id, teacherId, 'funding_expired');
      return { verificationStatus: 'funding_expired', action: null, student: studentSummary };
    }

    const session = await this.findMatchingSession(student.id, teacherId);
    if (!session) {
      await this.logBlocked(student.id, teacherId, 'no_session_found');
      const nearest = await this.findNearestSessionToday(student.id, teacherId);
      return {
        verificationStatus: 'no_session_found',
        action: null,
        student: studentSummary,
        nearestSessionAt: nearest?.date ?? null,
      };
    }

    const openLog = await this.prisma.attendanceLog.findFirst({
      where: { sessionId: session.id, checkoutAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (!openLog) {
      await this.prisma.attendanceLog.create({
        data: {
          sessionId: session.id,
          studentId: student.id,
          teacherId,
          checkinAt: new Date(),
          verificationStatus: 'valid',
          method: 'qr_scan',
        },
      });
      return { verificationStatus: 'valid', action: 'checkin', student: studentSummary };
    }

    const minutesSinceCheckin =
      (Date.now() - (openLog.checkinAt as Date).getTime()) / 60_000;
    if (minutesSinceCheckin < MIN_MINUTES_BEFORE_CHECKOUT) {
      // Re-scan quasi immédiat du même pass : très probablement accidentel
      // (caméra qui recapture avant que le pass soit rangé), pas une vraie
      // fin de séance. On confirme juste l'arrivée sans clôturer.
      return {
        verificationStatus: 'valid',
        action: 'checkin',
        student: studentSummary,
        alreadyCheckedIn: true,
      };
    }

    const checkoutAt = new Date();
    const scheduledEnd = new Date(session.date.getTime() + session.durationMinutes * 60_000);
    if (checkoutAt.getTime() < scheduledEnd.getTime()) {
      // Fin anticipee : on ne cloture rien tant que le prof n'a pas confirme
      // explicitement (voir confirmEarlyCheckout) — évite qu'un scan
      // accidentel ne clôture une séance en cours.
      const remainingMinutes = Math.ceil(
        (scheduledEnd.getTime() - checkoutAt.getTime()) / 60_000,
      );
      return {
        verificationStatus: 'valid',
        action: 'checkout_confirm_required',
        student: studentSummary,
        remainingMinutes,
        sessionId: session.id,
      };
    }

    await this.prisma.attendanceLog.update({
      where: { id: openLog.id },
      data: { checkoutAt },
    });
    const durationMinutes = Math.max(
      1,
      Math.round((checkoutAt.getTime() - (openLog.checkinAt as Date).getTime()) / 60000),
    );
    await this.prisma.session.update({
      where: { id: session.id },
      data: { status: 'realisee', attended: true, durationMinutes },
    });

    return {
      verificationStatus: 'valid',
      action: 'checkout',
      student: studentSummary,
      durationMinutes,
    };
  }

  async confirmEarlyCheckout(teacherId: string, dto: ConfirmEarlyCheckoutDto): Promise<ScanResult> {
    const session = await this.prisma.session.findUnique({
      where: { id: dto.sessionId },
      include: { student: { select: { id: true, name: true } } },
    });
    if (!session || session.teacherId !== teacherId) {
      throw new NotFoundException('Séance introuvable');
    }

    const openLog = await this.prisma.attendanceLog.findFirst({
      where: { sessionId: session.id, checkoutAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (!openLog) {
      throw new NotFoundException('Aucun pointage en cours pour cette séance');
    }

    const checkoutAt = new Date();
    await this.prisma.attendanceLog.update({
      where: { id: openLog.id },
      data: { checkoutAt, earlyEndReason: dto.reason },
    });
    const durationMinutes = Math.max(
      1,
      Math.round((checkoutAt.getTime() - (openLog.checkinAt as Date).getTime()) / 60000),
    );
    await this.prisma.session.update({
      where: { id: session.id },
      data: { status: 'realisee', attended: true, durationMinutes },
    });

    return {
      verificationStatus: 'valid',
      action: 'checkout',
      student: { id: session.student.id, name: session.student.name },
      durationMinutes,
    };
  }

  async manual(teacherId: string, dto: ManualAttendanceDto) {
    const session = await this.prisma.session.findUnique({ where: { id: dto.sessionId } });
    if (!session || session.teacherId !== teacherId) {
      throw new NotFoundException('Séance introuvable');
    }

    const now = new Date();
    const [log] = await this.prisma.$transaction([
      this.prisma.attendanceLog.create({
        data: {
          sessionId: session.id,
          studentId: session.studentId,
          teacherId,
          checkinAt: now,
          checkoutAt: now,
          verificationStatus: 'valid',
          method: 'manuel',
          manualReason: dto.manualReason,
        },
      }),
      this.prisma.session.update({
        where: { id: session.id },
        data: { status: 'realisee', attended: true },
      }),
    ]);

    return log;
  }

  private async hasExpiredFunding(studentId: string): Promise<boolean> {
    const fundingLinks = await this.prisma.fundingLink.findMany({ where: { studentId } });
    if (fundingLinks.length === 0) return false; // financement famille, pas concerné

    const hasActive = fundingLinks.some((link) => link.status === 'active');
    if (!hasActive) return true;

    const activeEmployeeIds = fundingLinks
      .filter((link) => link.status === 'active' && link.employeeId)
      .map((link) => link.employeeId as string);
    if (activeEmployeeIds.length === 0) return false;

    const employees = await this.prisma.employee.findMany({
      where: { id: { in: activeEmployeeIds } },
      include: { contract: true },
    });
    if (employees.length === 0) return false;

    return employees.every((employee) => ['expire', 'resilie'].includes(employee.contract.statut));
  }

  private async findMatchingSession(studentId: string, teacherId: string) {
    const now = Date.now();
    const lookupWindowMs = SESSION_LOOKUP_WINDOW_HOURS * 60 * 60_000;
    const scanWindowMs = SCAN_WINDOW_MINUTES * 60_000;

    const candidates = await this.prisma.session.findMany({
      where: {
        studentId,
        teacherId,
        status: { in: ['planifiee', 'confirmee'] },
        date: {
          gte: new Date(now - lookupWindowMs),
          lte: new Date(now + lookupWindowMs),
        },
      },
    });

    return (
      candidates.find((session) => {
        const start = session.date.getTime() - scanWindowMs;
        const end = session.date.getTime() + session.durationMinutes * 60_000 + scanWindowMs;
        return now >= start && now <= end;
      }) ?? null
    );
  }

  private findNearestSessionToday(studentId: string, teacherId: string) {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    return this.prisma.session.findFirst({
      where: {
        studentId,
        teacherId,
        status: { in: ['planifiee', 'confirmee'] },
        date: { gte: startOfDay, lte: endOfDay },
      },
      orderBy: { date: 'asc' },
    });
  }

  private logBlocked(studentId: string, teacherId: string, verificationStatus: string) {
    return this.prisma.attendanceLog.create({
      data: { studentId, teacherId, verificationStatus, method: 'qr_scan' },
    });
  }
}
