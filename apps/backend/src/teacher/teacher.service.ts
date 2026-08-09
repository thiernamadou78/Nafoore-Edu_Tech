import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PhotosService } from '../photos/photos.service';
import { EmailService } from '../email/email.service';
import { resolvePortalUrl } from '../email/portal-url.util';
import { renderSessionReportReminderEmail } from '../email/templates/session-report-reminder.template';
import { AuthenticatedTeacherAccount } from '../auth/teacher-auth.guard';
import { CreateTeacherSessionDto } from './dto/create-teacher-session.dto';
import { UpdateTeacherSessionDto } from './dto/update-teacher-session.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';
import { redactRemovedMessage, countUnread } from '../common/redact-message.util';

// Valeur de démonstration en attendant un vrai taux horaire par matching
// (cf. décision différée sur StudentTeacher.hourlyRate).
const DEMO_HOURLY_RATE = 22;

@Injectable()
export class TeacherService {
  private readonly logger = new Logger(TeacherService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly photos: PhotosService,
    private readonly emailService: EmailService,
  ) {}

  me(teacherAccount: AuthenticatedTeacherAccount) {
    return {
      id: teacherAccount.id,
      email: teacherAccount.email,
      fullName: teacherAccount.fullName,
      mustChangePassword: teacherAccount.mustChangePassword,
      status: teacherAccount.status,
    };
  }

  async markPasswordChanged(teacherAccountId: string) {
    await this.prisma.teacherAccount.update({
      where: { id: teacherAccountId },
      data: { mustChangePassword: false },
    });
  }

  async listMyStudents(teacherAccount: AuthenticatedTeacherAccount) {
    if (!teacherAccount.teacherId) return [];

    const students = await this.prisma.student.findMany({
      where: { teachers: { some: { teacherId: teacherAccount.teacherId } } },
      select: {
        id: true,
        name: true,
        level: true,
        school: true,
        photoPath: true,
        parentLead: {
          select: { id: true, name: true, portalAccount: { select: { familyName: true } } },
        },
        teachers: {
          where: { teacherId: teacherAccount.teacherId },
          select: { subject: true },
        },
        sessions: {
          where: {
            teacherId: teacherAccount.teacherId,
            date: { gte: new Date() },
            status: { not: 'annulee' },
          },
          orderBy: { date: 'asc' },
          take: 1,
          select: { date: true, subject: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    const photoUrls = await this.photos.signUrls(students.map((s) => s.photoPath));
    return students.map(({ parentLead, teachers, sessions, photoPath, ...student }) => ({
      ...student,
      subjects: [...new Set(teachers.map((t) => t.subject).filter(Boolean))],
      familyId: parentLead?.id ?? null,
      familyName: parentLead?.portalAccount?.familyName ?? parentLead?.name ?? 'Sans famille',
      nextSession: sessions[0] ?? null,
      photoUrl: photoPath ? (photoUrls.get(photoPath) ?? null) : null,
    }));
  }

  async getStudent(teacherAccount: AuthenticatedTeacherAccount, studentId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        name: true,
        level: true,
        school: true,
        address: true,
        photoPath: true,
        parentLead: { select: { name: true, email: true, phone: true } },
        teachers: { select: { teacherId: true, subject: true } },
        sessions: {
          where: {
            teacherId: teacherAccount.teacherId ?? undefined,
            date: { gte: new Date() },
            status: { not: 'annulee' },
          },
          orderBy: { date: 'asc' },
          take: 1,
          select: { date: true, subject: true },
        },
      },
    });

    if (!student || !student.teachers.some((t) => t.teacherId === teacherAccount.teacherId)) {
      throw new NotFoundException('Élève introuvable');
    }

    const { teachers, sessions, photoPath, parentLead, ...rest } = student;
    const photoUrl = await this.photos.signUrl(photoPath);

    return {
      ...rest,
      subjects: [
        ...new Set(
          teachers
            .filter((t) => t.teacherId === teacherAccount.teacherId)
            .map((t) => t.subject)
            .filter(Boolean),
        ),
      ],
      family: parentLead,
      nextSession: sessions[0] ?? null,
      photoUrl,
    };
  }

  async listMySessions(teacherAccount: AuthenticatedTeacherAccount) {
    if (!teacherAccount.teacherId) return [];

    const sessions = await this.prisma.session.findMany({
      where: { teacherId: teacherAccount.teacherId },
      include: { student: { select: { id: true, name: true } } },
      orderBy: { date: 'desc' },
    });

    return sessions.map(({ student, ...session }) => ({
      ...session,
      studentId: student.id,
      studentName: student.name,
    }));
  }

  private async assertNoConflict(
    teacherId: string,
    startsAt: Date,
    durationMinutes: number,
    excludeSessionId?: string,
  ) {
    const endsAt = new Date(startsAt.getTime() + durationMinutes * 60000);
    const MAX_SESSION_MINUTES = 240;

    const candidates = await this.prisma.session.findMany({
      where: {
        teacherId,
        status: { not: 'annulee' },
        id: excludeSessionId ? { not: excludeSessionId } : undefined,
        date: {
          gte: new Date(startsAt.getTime() - MAX_SESSION_MINUTES * 60000),
          lt: endsAt,
        },
      },
      include: { student: { select: { name: true } } },
    });

    const conflict = candidates.find((c) => {
      const cEnd = new Date(c.date.getTime() + c.durationMinutes * 60000);
      return cEnd > startsAt;
    });

    if (conflict) {
      throw new ConflictException(
        `Tu as déjà une séance prévue sur ce créneau avec ${conflict.student.name}`,
      );
    }
  }

  async createSession(teacherAccount: AuthenticatedTeacherAccount, dto: CreateTeacherSessionDto) {
    const assignment = await this.prisma.studentTeacher.findFirst({
      where: {
        studentId: dto.studentId,
        teacherId: teacherAccount.teacherId ?? undefined,
        subject: dto.subject,
      },
    });
    if (!assignment) {
      throw new BadRequestException("Tu n'enseignes pas cette matière à cet élève");
    }

    const durationMinutes = dto.durationMinutes ?? 60;
    const startsAt = new Date(dto.date);
    await this.assertNoConflict(teacherAccount.teacherId as string, startsAt, durationMinutes);

    return this.prisma.session.create({
      data: {
        studentId: dto.studentId,
        teacherId: teacherAccount.teacherId,
        subject: dto.subject,
        date: startsAt,
        durationMinutes,
        // Confirmée directement : c'est l'enseignant qui plante lui-même le créneau,
        // pas une proposition à valider par quelqu'un d'autre.
        status: 'confirmee',
      },
    });
  }

  async updateSession(
    teacherAccount: AuthenticatedTeacherAccount,
    sessionId: string,
    dto: UpdateTeacherSessionDto,
  ) {
    const session = await this.prisma.session.findUnique({ where: { id: sessionId } });
    if (!session || session.teacherId !== teacherAccount.teacherId) {
      throw new NotFoundException('Séance introuvable');
    }

    if (dto.status === 'annulee' && !dto.cancellationReason?.trim()) {
      throw new BadRequestException("Un motif d'annulation est requis");
    }

    if (dto.date || dto.durationMinutes) {
      const startsAt = dto.date ? new Date(dto.date) : session.date;
      const durationMinutes = dto.durationMinutes ?? session.durationMinutes;
      await this.assertNoConflict(
        session.teacherId as string,
        startsAt,
        durationMinutes,
        sessionId,
      );
    }

    return this.prisma.session.update({
      where: { id: sessionId },
      data: {
        date: dto.date ? new Date(dto.date) : undefined,
        durationMinutes: dto.durationMinutes,
        status: dto.status,
        attended: dto.attended,
        notes: dto.notes,
        cancellationReason: dto.cancellationReason,
      },
    });
  }

  async getDashboard(teacherAccount: AuthenticatedTeacherAccount) {
    if (!teacherAccount.teacherId) {
      return { upcomingSessions: [], pendingReportsCount: 0, studentsCount: 0, familiesCount: 0 };
    }
    const teacherId = teacherAccount.teacherId;

    const [upcoming, pendingReports, students] = await Promise.all([
      this.prisma.session.findMany({
        where: { teacherId, date: { gte: new Date() }, status: { not: 'annulee' } },
        orderBy: { date: 'asc' },
        take: 5,
        include: { student: { select: { name: true } } },
      }),
      this.prisma.session.count({
        where: {
          teacherId,
          date: { lt: new Date() },
          status: { notIn: ['annulee', 'realisee'] },
        },
      }),
      this.prisma.student.findMany({
        where: { teachers: { some: { teacherId } } },
        select: { parentLeadId: true },
      }),
    ]);

    return {
      upcomingSessions: upcoming.map(({ student, ...session }) => ({
        ...session,
        studentName: student.name,
      })),
      pendingReportsCount: pendingReports,
      studentsCount: students.length,
      familiesCount: new Set(students.map((s) => s.parentLeadId).filter(Boolean)).size,
    };
  }

  async getPayments(teacherAccount: AuthenticatedTeacherAccount) {
    if (!teacherAccount.teacherId) {
      return { hoursThisMonth: 0, amountThisMonth: 0, hourlyRate: DEMO_HOURLY_RATE, history: [] };
    }
    const teacherId = teacherAccount.teacherId;
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [sessionsThisMonth, history] = await Promise.all([
      this.prisma.session.findMany({
        where: { teacherId, status: 'realisee', date: { gte: startOfMonth } },
        select: { durationMinutes: true },
      }),
      this.prisma.teacherPayment.findMany({
        where: { teacherId },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const hoursThisMonth =
      sessionsThisMonth.reduce((sum, s) => sum + s.durationMinutes, 0) / 60;

    return {
      hoursThisMonth: Math.round(hoursThisMonth * 100) / 100,
      amountThisMonth: Math.round(hoursThisMonth * DEMO_HOURLY_RATE * 100) / 100,
      hourlyRate: DEMO_HOURLY_RATE,
      history,
    };
  }

  async listMyMessageThreads(teacherAccount: AuthenticatedTeacherAccount) {
    if (!teacherAccount.teacherId) return [];
    const threads = await this.prisma.messageThread.findMany({
      where: { teacherId: teacherAccount.teacherId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });

    return threads.map(({ messages, ...thread }) => ({
      ...thread,
      messages: messages.map((m) => redactRemovedMessage(m)),
      unreadCount: countUnread(messages, 'teacher', thread.teacherReadAt),
    }));
  }

  async markThreadRead(teacherAccount: AuthenticatedTeacherAccount, threadId: string) {
    const thread = await this.prisma.messageThread.findUnique({ where: { id: threadId } });
    if (!thread || thread.teacherId !== teacherAccount.teacherId) {
      throw new NotFoundException('Conversation introuvable');
    }
    await this.prisma.messageThread.update({
      where: { id: threadId },
      data: { teacherReadAt: new Date() },
    });
    return { teacherReadAt: new Date().toISOString() };
  }

  async getUnreadMessageCount(teacherAccount: AuthenticatedTeacherAccount) {
    if (!teacherAccount.teacherId) return { count: 0 };
    const threads = await this.prisma.messageThread.findMany({
      where: { teacherId: teacherAccount.teacherId },
      select: {
        teacherReadAt: true,
        messages: { select: { sender: true, createdAt: true, removedAt: true } },
      },
    });
    const count = threads.reduce(
      (sum, t) => sum + countUnread(t.messages, 'teacher', t.teacherReadAt),
      0,
    );
    return { count };
  }

  async sendMessage(
    teacherAccount: AuthenticatedTeacherAccount,
    threadId: string,
    dto: SendMessageDto,
  ) {
    const thread = await this.prisma.messageThread.findUnique({ where: { id: threadId } });
    if (!thread || thread.teacherId !== teacherAccount.teacherId) {
      throw new NotFoundException('Conversation introuvable');
    }
    return this.prisma.message.create({
      data: { threadId, sender: 'teacher', body: dto.body },
    });
  }

  async listMyReviews(teacherAccount: AuthenticatedTeacherAccount) {
    if (!teacherAccount.teacherId) return [];
    return this.prisma.teacherReview.findMany({
      where: { teacherId: teacherAccount.teacherId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createSupportTicket(
    teacherAccount: AuthenticatedTeacherAccount,
    dto: CreateSupportTicketDto,
  ) {
    return this.prisma.supportTicket.create({
      data: {
        teacherId: teacherAccount.teacherId as string,
        subject: dto.subject,
        message: dto.message,
      },
    });
  }

  // Déclenchement manuel (outil de démonstration) : aucune tâche planifiée
  // automatique n'existe dans ce backend. Cherche les séances passées depuis
  // plus de 24h sans compte-rendu et envoie un rappel par email.
  async simulateReportReminders(teacherAccount: AuthenticatedTeacherAccount) {
    if (!teacherAccount.teacherId) return { sent: 0 };

    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const sessions = await this.prisma.session.findMany({
      where: {
        teacherId: teacherAccount.teacherId,
        date: { lt: cutoff },
        status: { notIn: ['annulee', 'realisee'] },
      },
      include: { student: { select: { name: true } } },
    });

    let sent = 0;
    for (const session of sessions) {
      try {
        await this.emailService.send({
          to: teacherAccount.email,
          subject: `Nafoore — Compte-rendu à rédiger pour ${session.student.name}`,
          html: renderSessionReportReminderEmail({
            fullName: teacherAccount.fullName,
            studentName: session.student.name,
            sessionDate: session.date.toLocaleDateString('fr-FR', {
              dateStyle: 'medium',
            }),
            portalUrl: resolvePortalUrl('teacher'),
          }),
        });
        sent += 1;
      } catch (error) {
        this.logger.error(
          `Échec d'envoi du rappel pour la séance ${session.id}`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }

    return { sent, candidates: sessions.length };
  }
}
