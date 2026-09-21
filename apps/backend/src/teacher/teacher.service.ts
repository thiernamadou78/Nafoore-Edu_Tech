import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { PhotosService } from '../photos/photos.service';
import { EmailService } from '../email/email.service';
import { GeocodingService } from '../geocoding/geocoding.service';
import { UpdateTeacherDto } from '../teachers/dto/update-teacher.dto';
import { resolvePortalUrl } from '../email/portal-url.util';
import { renderSessionReportReminderEmail } from '../email/templates/session-report-reminder.template';
import { renderSessionCancelledEmail } from '../email/templates/session-cancelled.template';
import { AuthenticatedTeacherAccount } from '../auth/teacher-auth.guard';
import { CreateTeacherSessionDto } from './dto/create-teacher-session.dto';
import { UpdateTeacherSessionDto } from './dto/update-teacher-session.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { StartThreadDto } from './dto/start-thread.dto';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';
import { ReplySupportTicketDto } from './dto/reply-support-ticket.dto';
import { UpsertProgressEntryDto } from '../students/dto/upsert-progress-entry.dto';
import { redactRemovedMessage, countUnread } from '../common/redact-message.util';

@Injectable()
export class TeacherService {
  private readonly logger = new Logger(TeacherService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly photos: PhotosService,
    private readonly emailService: EmailService,
    private readonly geocoding: GeocodingService,
  ) {}

  async me(teacherAccount: AuthenticatedTeacherAccount) {
    const teacher = teacherAccount.teacherId
      ? await this.prisma.teacher.findUnique({
          where: { id: teacherAccount.teacherId },
          select: { photoPath: true },
        })
      : null;
    return {
      hasPhoto: Boolean(teacher?.photoPath),
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

  async getMyProfile(teacherAccount: AuthenticatedTeacherAccount) {
    if (!teacherAccount.teacherId) return null;
    const teacher = await this.prisma.teacher.findUnique({
      where: { id: teacherAccount.teacherId },
      select: {
        name: true,
        gender: true,
        address: true,
        postalCode: true,
        email: true,
        phone: true,
        bio: true,
        subjects: true,
        photoPath: true,
      },
    });
    if (!teacher) return null;
    const { photoPath, ...rest } = teacher;
    return { ...rest, photoUrl: await this.photos.signUrl(photoPath) };
  }

  async updateMyProfile(teacherAccount: AuthenticatedTeacherAccount, dto: UpdateTeacherDto) {
    if (!teacherAccount.teacherId) {
      throw new NotFoundException('Profil enseignant introuvable');
    }
    const updated = await this.prisma.teacher.update({
      where: { id: teacherAccount.teacherId },
      data: dto,
      select: {
        name: true,
        gender: true,
        address: true,
        postalCode: true,
        email: true,
        phone: true,
        bio: true,
        subjects: true,
        photoPath: true,
      },
    });
    const { photoPath, ...teacher } = updated;
    if (dto.address) {
      this.geocoding
        .geocode(dto.address, dto.postalCode)
        .then((coords) => {
          if (!coords) return;
          return this.prisma.teacher.update({ where: { id: teacherAccount.teacherId as string }, data: coords });
        })
        .catch((error) =>
          this.logger.warn(`Géocodage de l'enseignant ${teacherAccount.teacherId} échoué: ${error}`),
        );
    }
    return { ...teacher, photoUrl: await this.photos.signUrl(photoPath) };
  }

  async uploadMyPhoto(teacherAccount: AuthenticatedTeacherAccount, file: Express.Multer.File) {
    if (!teacherAccount.teacherId) {
      throw new NotFoundException('Profil enseignant introuvable');
    }
    const teacherId = teacherAccount.teacherId;
    const existing = await this.prisma.teacher.findUnique({
      where: { id: teacherId },
      select: { photoPath: true },
    });
    if (existing?.photoPath) {
      await this.photos.remove(existing.photoPath);
    }
    const path = this.photos.buildPath('teachers', teacherId, file.originalname);
    await this.photos.upload(path, file);
    await this.prisma.teacher.update({ where: { id: teacherId }, data: { photoPath: path } });
    return { photoUrl: await this.photos.signUrl(path) };
  }

  async removeMyPhoto(teacherAccount: AuthenticatedTeacherAccount) {
    if (!teacherAccount.teacherId) {
      throw new NotFoundException('Profil enseignant introuvable');
    }
    const teacherId = teacherAccount.teacherId;
    const existing = await this.prisma.teacher.findUnique({
      where: { id: teacherId },
      select: { photoPath: true },
    });
    if (existing?.photoPath) {
      await this.photos.remove(existing.photoPath);
      await this.prisma.teacher.update({ where: { id: teacherId }, data: { photoPath: null } });
    }
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
        recurringSchedules: {
          where: { teacherId: teacherAccount.teacherId ?? undefined, active: true },
        },
      },
    });

    if (!student || !student.teachers.some((t) => t.teacherId === teacherAccount.teacherId)) {
      throw new NotFoundException('Élève introuvable');
    }

    const { teachers, sessions, recurringSchedules, photoPath, parentLead, ...rest } = student;
    const [photoUrl, realized, acceptedRequests] = await Promise.all([
      this.photos.signUrl(photoPath),
      this.prisma.session.aggregate({
        // Un compte-rendu seul (sans pointage QR/manuel) ne prouve pas une
        // durée réelle : seules les séances avec un pointage clôturé comptent.
        where: {
          studentId,
          status: 'realisee',
          attendanceLogs: { some: { checkoutAt: { not: null } } },
        },
        _sum: { durationMinutes: true },
      }),
      // Duree de seance demandee par la famille pour chaque matiere : utilisee
      // comme defaut quand le prof cree le planning, pour qu'il n'ait pas a la
      // redefinir lui-meme.
      this.prisma.teacherRequest.findMany({
        where: { studentId, status: 'acceptee', durationMinutes: { not: null } },
        select: { subject: true, durationMinutes: true },
      }),
    ]);
    const requestedDurationBySubject = Object.fromEntries(
      acceptedRequests.map((r) => [r.subject, r.durationMinutes]),
    );

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
      // Un prof peut avoir plusieurs matieres pour le meme eleve : un
      // planning independant par matiere, jamais un seul planning global.
      schedules: recurringSchedules,
      requestedDurationBySubject,
      totalMinutesRealized: realized._sum.durationMinutes ?? 0,
      photoUrl,
    };
  }

  private async assertOwnsStudent(teacherAccount: AuthenticatedTeacherAccount, studentId: string) {
    const assignment = await this.prisma.studentTeacher.findFirst({
      where: { studentId, teacherId: teacherAccount.teacherId ?? undefined },
    });
    if (!assignment) {
      throw new NotFoundException('Élève introuvable');
    }
  }

  async listProgressEntries(teacherAccount: AuthenticatedTeacherAccount, studentId: string) {
    await this.assertOwnsStudent(teacherAccount, studentId);
    return this.prisma.progressEntry.findMany({
      where: { studentId },
      orderBy: { subject: 'asc' },
    });
  }

  async upsertProgressEntry(
    teacherAccount: AuthenticatedTeacherAccount,
    studentId: string,
    dto: UpsertProgressEntryDto,
  ) {
    await this.assertOwnsStudent(teacherAccount, studentId);
    return this.prisma.progressEntry.upsert({
      where: { studentId_subject: { studentId, subject: dto.subject } },
      create: {
        studentId,
        subject: dto.subject,
        status: dto.status,
        teacherId: teacherAccount.teacherId,
      },
      update: {
        status: dto.status,
        teacherId: teacherAccount.teacherId,
        adminAccountId: null,
      },
    });
  }

  async listMySessions(teacherAccount: AuthenticatedTeacherAccount) {
    if (!teacherAccount.teacherId) return [];

    const sessions = await this.prisma.session.findMany({
      where: { teacherId: teacherAccount.teacherId },
      include: {
        student: { select: { id: true, name: true } },
        attendanceLogs: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { checkinAt: true, checkoutAt: true },
        },
      },
      orderBy: { date: 'desc' },
    });

    const baselines = await this.prisma.grade.findMany({
      where: { kind: 'depart', studentId: { in: [...new Set(sessions.map((s) => s.studentId))] } },
      select: { studentId: true, subject: true },
    });
    const withBaseline = new Set(baselines.map((b) => `${b.studentId}|${b.subject}`));

    return sessions.map(({ student, attendanceLogs, ...session }) => ({
      ...session,
      studentId: student.id,
      studentName: student.name,
      lastAttendance: attendanceLogs[0] ?? null,
      baselineMissing: Boolean(
        session.subject && !withBaseline.has(`${student.id}|${session.subject}`),
      ),
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

    // Le pointage (QR ou manuel) clôture la présence mais jamais la séance
    // elle-même : sans compte-rendu, une intervention pointée resterait
    // "réalisée" sans jamais avoir été documentée.
    if (dto.status === 'realisee' && !dto.notes?.trim()) {
      throw new BadRequestException('Un compte-rendu est requis pour clôturer une séance');
    }

    // Notes de depart obligatoires : sans elles, aucune progression ne pourra
    // etre mesuree pour la famille. On bloque donc la cloture, pas la seance.
    if (dto.status === 'realisee' && session.subject) {
      const baseline = await this.prisma.grade.count({
        where: { studentId: session.studentId, subject: session.subject, kind: 'depart' },
      });
      if (baseline === 0) {
        throw new BadRequestException(
          `Saisis d'abord les notes de départ de l'élève en ${session.subject} (fiche de l'élève, section Notes) avant de clôturer cette séance`,
        );
      }
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

    // Le tarif est fige a la cloture : une revision ulterieure ne reprix pas
    // une seance deja donnee.
    let closingRate: number | undefined;
    if (dto.status === 'realisee' && session.hourlyRate === null) {
      closingRate = (await this.findAssignmentRate(session.studentId, session.teacherId as string, session.subject)) ?? undefined;
    }

    const updated = await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        hourlyRate: closingRate,
        date: dto.date ? new Date(dto.date) : undefined,
        durationMinutes: dto.durationMinutes,
        status: dto.status,
        attended: dto.attended,
        notes: dto.notes,
        cancellationReason: dto.cancellationReason,
      },
    });

    if (dto.status === 'annulee' && session.status !== 'annulee') {
      this.notifyFamilyOfCancellation(updated).catch((error) => {
        this.logger.error(
          `Échec d'envoi de l'email d'annulation pour la séance ${sessionId}`,
          error instanceof Error ? error.stack : undefined,
        );
      });
    }

    return updated;
  }

  // Best-effort : ne doit jamais faire échouer l'annulation elle-même si
  // l'email ne part pas (famille sans email valide, panne du provider…).
  private async notifyFamilyOfCancellation(session: {
    id: string;
    studentId: string;
    teacherId: string | null;
    date: Date;
    cancellationReason: string | null;
  }) {
    if (!session.teacherId) return;

    const [student, teacher] = await Promise.all([
      this.prisma.student.findUnique({
        where: { id: session.studentId },
        select: {
          name: true,
          parentLead: {
            select: { email: true, portalAccount: { select: { email: true } } },
          },
        },
      }),
      this.prisma.teacher.findUnique({ where: { id: session.teacherId }, select: { name: true } }),
    ]);

    const recipient = student?.parentLead?.portalAccount?.email ?? student?.parentLead?.email;
    if (!recipient || !student || !teacher) return;

    await this.emailService.send({
      to: recipient,
      subject: `Nafoore Education — Séance annulée pour ${student.name}`,
      html: renderSessionCancelledEmail({
        studentName: student.name,
        teacherName: teacher.name,
        sessionDate: session.date.toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' }),
        reason: session.cancellationReason ?? 'Non précisé',
        portalUrl: resolvePortalUrl('famille'),
      }),
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

  // Tarif de l'accompagnement (eleve + matiere), a defaut celui de l'eleve avec
  // ce prof toutes matieres confondues.
  private async findAssignmentRate(
    studentId: string,
    teacherId: string,
    subject: string | null,
  ): Promise<number | null> {
    const exact = subject
      ? await this.prisma.studentTeacher.findFirst({ where: { studentId, teacherId, subject } })
      : null;
    if (exact?.hourlyRate) return exact.hourlyRate;
    const any = await this.prisma.studentTeacher.findFirst({
      where: { studentId, teacherId, hourlyRate: { not: null } },
    });
    return any?.hourlyRate ?? null;
  }

  async getPayments(teacherAccount: AuthenticatedTeacherAccount) {
    if (!teacherAccount.teacherId) {
      return { minutesThisMonth: 0, amountThisMonth: 0, unpricedSessions: 0, rates: [], sessionsThisMonth: [], history: [] };
    }
    const teacherId = teacherAccount.teacherId;
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [sessionsThisMonth, history, assignments] = await Promise.all([
      this.prisma.session.findMany({
        // Un compte-rendu seul (sans pointage QR/manuel) ne prouve pas une
        // durée réelle : seules les séances avec un pointage clôturé comptent
        // dans les heures/la rémunération.
        where: {
          teacherId,
          status: 'realisee',
          date: { gte: startOfMonth },
          attendanceLogs: { some: { checkoutAt: { not: null } } },
        },
        orderBy: { date: 'desc' },
        include: {
          student: { select: { name: true } },
          attendanceLogs: {
            where: { checkoutAt: { not: null } },
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { checkinAt: true, checkoutAt: true },
          },
        },
      }),
      this.prisma.teacherPayment.findMany({
        where: { teacherId },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.studentTeacher.findMany({
        where: { teacherId },
        select: { studentId: true, subject: true, hourlyRate: true, student: { select: { name: true } } },
        orderBy: { assignedAt: 'desc' },
      }),
    ]);

    // Tarif d'une seance : celui fige a la cloture, sinon le tarif actuel de
    // l'accompagnement (eleve + matiere, puis eleve seul).
    const liveRate = (studentId: string, subject: string | null) =>
      assignments.find((a) => a.studentId === studentId && a.subject === subject && a.hourlyRate)?.hourlyRate ??
      assignments.find((a) => a.studentId === studentId && a.hourlyRate)?.hourlyRate ??
      null;

    const sessions = sessionsThisMonth.map(({ student, attendanceLogs, ...session }) => {
      const hourlyRate = session.hourlyRate ?? liveRate(session.studentId, session.subject);
      return {
        ...session,
        studentName: student.name,
        hourlyRate,
        amount: hourlyRate ? Math.round((session.durationMinutes / 60) * hourlyRate * 100) / 100 : null,
        checkinAt: attendanceLogs[0]?.checkinAt ?? null,
        checkoutAt: attendanceLogs[0]?.checkoutAt ?? null,
      };
    });

    return {
      minutesThisMonth: sessions.reduce((sum, s) => sum + s.durationMinutes, 0),
      amountThisMonth: Math.round(sessions.reduce((sum, s) => sum + (s.amount ?? 0), 0) * 100) / 100,
      unpricedSessions: sessions.filter((s) => s.hourlyRate === null).length,
      rates: assignments.map((a) => ({
        studentName: a.student.name,
        subject: a.subject,
        hourlyRate: a.hourlyRate,
      })),
      sessionsThisMonth: sessions,
      history,
    };
  }

  async startOrGetThread(teacherAccount: AuthenticatedTeacherAccount, dto: StartThreadDto) {
    const teacherId = teacherAccount.teacherId as string;
    const owns = await this.prisma.studentTeacher.findFirst({
      where: { teacherId, student: { parentLeadId: dto.leadId } },
    });
    if (!owns) {
      throw new NotFoundException('Famille introuvable');
    }

    const existing = await this.prisma.messageThread.findFirst({
      where: { teacherId, leadId: dto.leadId },
    });
    if (existing) return existing;

    const lead = await this.prisma.lead.findUnique({
      where: { id: dto.leadId },
      select: { name: true, portalAccount: { select: { familyName: true } } },
    });

    return this.prisma.messageThread.create({
      data: {
        teacherId,
        leadId: dto.leadId,
        familyName: lead?.portalAccount?.familyName ?? lead?.name ?? 'Famille',
      },
    });
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

  async listMySupportTickets(teacherAccount: AuthenticatedTeacherAccount) {
    if (!teacherAccount.teacherId) return [];
    return this.prisma.supportTicket.findMany({
      where: { teacherId: teacherAccount.teacherId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async replyToSupportTicket(
    teacherAccount: AuthenticatedTeacherAccount,
    ticketId: string,
    dto: ReplySupportTicketDto,
  ) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket || ticket.teacherId !== teacherAccount.teacherId) {
      throw new NotFoundException('Ticket introuvable');
    }
    await this.prisma.supportMessage.create({
      data: { ticketId, sender: 'teacher', body: dto.body },
    });
    return this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
  }

  // Backstop automatique : le prof est censé être invité à renseigner le
  // compte-rendu juste après son pointage (front, Pointage.jsx / Planning.jsx),
  // mais ce filet de sécurité couvre les cas où il ignore/ferme cette
  // invitation — ou n'a jamais pointé du tout. Un seul email par séance
  // (reportReminderSentAt), pas de relance répétée.
  @Cron(CronExpression.EVERY_HOUR)
  async remindMissingReports() {
    const now = new Date();
    // Séance jamais touchée (toujours planifiee/confirmee) : on laisse 24h
    // de battement avant de considérer que le compte-rendu est "manquant".
    const untouchedCutoff = new Date(now.getTime() - 24 * 3_600_000);
    // Séance pointée réalisée mais sans note pédagogique : battement plus
    // court, l'invitation immédiate côté front a déjà eu sa chance.
    const emptyReportCutoff = new Date(now.getTime() - 2 * 3_600_000);

    const candidates = await this.prisma.session.findMany({
      where: {
        status: { not: 'annulee' },
        reportReminderSentAt: null,
        date: { lt: now },
        teacherId: { not: null },
      },
      include: {
        student: { select: { name: true } },
        teacher: { select: { name: true, gender: true, account: { select: { email: true } } } },
      },
    });

    let sent = 0;
    for (const session of candidates) {
      const scheduledEnd = new Date(session.date.getTime() + session.durationMinutes * 60_000);
      const isUntouched = session.status !== 'realisee' && session.date < untouchedCutoff;
      const isEmptyReport =
        session.status === 'realisee' && !session.notes?.trim() && scheduledEnd < emptyReportCutoff;
      if (!isUntouched && !isEmptyReport) continue;

      const recipient = session.teacher?.account?.email;
      if (!recipient) continue;

      try {
        await this.emailService.send({
          to: recipient,
          subject: `Nafoore Education — Compte-rendu à rédiger pour ${session.student.name}`,
          html: renderSessionReportReminderEmail({
            gender: session.teacher?.gender,
            fullName: session.teacher?.name ?? '',
            studentName: session.student.name,
            sessionDate: session.date.toLocaleDateString('fr-FR', { dateStyle: 'medium' }),
            portalUrl: resolvePortalUrl('teacher'),
          }),
        });
        await this.prisma.session.update({
          where: { id: session.id },
          data: { reportReminderSentAt: now },
        });
        sent += 1;
      } catch (error) {
        this.logger.error(
          `Échec d'envoi du rappel de compte-rendu pour la séance ${session.id}`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }

    if (sent > 0) {
      this.logger.log(`${sent} rappel(s) de compte-rendu manquant envoyé(s)`);
    }
  }
}
