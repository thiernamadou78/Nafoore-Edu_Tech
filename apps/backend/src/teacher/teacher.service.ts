import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PhotosService } from '../photos/photos.service';
import { AuthenticatedTeacherAccount } from '../auth/teacher-auth.guard';
import { CreateTeacherSessionDto } from './dto/create-teacher-session.dto';
import { UpdateTeacherSessionDto } from './dto/update-teacher-session.dto';

@Injectable()
export class TeacherService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly photos: PhotosService,
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
}
