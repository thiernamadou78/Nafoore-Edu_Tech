import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PhotosService } from '../photos/photos.service';
import { AuthenticatedPortalAccount } from '../auth/portal-auth.guard';
import { CreateFamilyStudentDto } from './dto/create-family-student.dto';
import { SetFamilyNameDto } from './dto/set-family-name.dto';
import { StartThreadDto } from './dto/start-thread.dto';
import { SendFamilyMessageDto } from './dto/send-family-message.dto';
import { redactRemovedMessage, countUnread } from '../common/redact-message.util';

const teacherSelect = {
  teacher: { select: { id: true, name: true, subjects: true } },
};

@Injectable()
export class FamilyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly photos: PhotosService,
  ) {}

  me(portalAccount: AuthenticatedPortalAccount) {
    return {
      id: portalAccount.id,
      email: portalAccount.email,
      fullName: portalAccount.fullName,
      familyName: portalAccount.familyName,
      role: portalAccount.role,
      mustChangePassword: portalAccount.mustChangePassword,
      status: portalAccount.status,
    };
  }

  async markPasswordChanged(portalAccountId: string) {
    await this.prisma.portalAccount.update({
      where: { id: portalAccountId },
      data: { mustChangePassword: false },
    });
  }

  async setFamilyName(portalAccountId: string, dto: SetFamilyNameDto) {
    await this.prisma.portalAccount.update({
      where: { id: portalAccountId },
      data: { familyName: dto.familyName },
    });
  }

  createStudent(portalAccount: AuthenticatedPortalAccount, dto: CreateFamilyStudentDto) {
    return this.prisma.student.create({
      data: {
        name: dto.name,
        level: dto.level,
        school: dto.school,
        address: dto.address,
        subjects: dto.subjects ?? [],
        parentLeadId: portalAccount.leadId,
      },
    });
  }

  async listMyStudents(portalAccount: AuthenticatedPortalAccount) {
    const students = await this.prisma.student.findMany({
      where: { parentLeadId: portalAccount.leadId },
      select: {
        id: true,
        name: true,
        level: true,
        school: true,
        photoPath: true,
        teacherRequests: {
          where: { status: { in: ['en_attente', 'proposition_envoyee'] } },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { status: true },
        },
        sessions: {
          where: { date: { gte: new Date() }, status: { not: 'annulee' } },
          orderBy: { date: 'asc' },
          take: 1,
          select: {
            date: true,
            subject: true,
            teacher: { select: { name: true } },
          },
        },
        teachers: {
          take: 1,
          orderBy: { assignedAt: 'desc' },
          select: { teacher: { select: { name: true } } },
        },
      },
      orderBy: { name: 'asc' },
    });

    const photoUrls = await this.photos.signUrls(
      students.map((s) => s.photoPath),
    );
    return students.map(({ teacherRequests, sessions, teachers, ...student }) => {
      const nextSession = sessions[0]
        ? {
            date: sessions[0].date,
            subject: sessions[0].subject,
            teacherName: sessions[0].teacher?.name ?? null,
          }
        : null;
      return {
        ...student,
        pendingRequestStatus: teacherRequests[0]?.status ?? null,
        nextSession,
        teacherName: nextSession?.teacherName ?? teachers[0]?.teacher.name ?? null,
        photoUrl: student.photoPath
          ? (photoUrls.get(student.photoPath) ?? null)
          : null,
      };
    });
  }

  async getStudent(portalAccount: AuthenticatedPortalAccount, id: string) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        level: true,
        school: true,
        address: true,
        photoPath: true,
        parentLeadId: true,
        teachers: { select: teacherSelect },
        sessions: {
          select: {
            id: true,
            date: true,
            subject: true,
            status: true,
            attended: true,
            teacher: { select: { id: true, name: true } },
          },
          orderBy: { date: 'desc' },
        },
        progressReports: {
          where: { shareable: true },
          select: {
            id: true,
            period: true,
            content: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        progressEntries: {
          orderBy: { subject: 'asc' },
          select: { id: true, subject: true, status: true },
        },
        teacherRequests: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            subject: true,
            frequency: true,
            format: true,
            availability: true,
            status: true,
            createdAt: true,
            matchings: {
              orderBy: { createdAt: 'desc' },
              select: {
                id: true,
                status: true,
                createdAt: true,
                respondedAt: true,
                refusalReason: true,
                // Mini-profil enseignant : jamais email/phone/application/
                // history/students/sessions (contact direct + données internes).
                teacher: {
                  select: {
                    id: true,
                    name: true,
                    subjects: true,
                    bio: true,
                    zone: true,
                    verified: true,
                    photoPath: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // 404 (pas 403) si l'élève n'existe pas OU n'appartient pas à ce compte —
    // ne pas révéler qu'un id appartient à quelqu'un d'autre.
    if (!student || student.parentLeadId !== portalAccount.leadId) {
      throw new NotFoundException('Élève introuvable');
    }

    const { photoPath, parentLeadId, ...rest } = student;
    const photoUrl = await this.photos.signUrl(photoPath);

    const teacherPhotoPaths = rest.teacherRequests.flatMap((request) =>
      request.matchings.map((matching) => matching.teacher.photoPath),
    );
    const teacherPhotoUrls = await this.photos.signUrls(teacherPhotoPaths);
    const teacherRequests = rest.teacherRequests.map((request) => ({
      ...request,
      matchings: request.matchings.map((matching) => {
        const { photoPath: teacherPhotoPath, ...teacherRest } = matching.teacher;
        return {
          ...matching,
          teacher: {
            ...teacherRest,
            photoUrl: teacherPhotoPath
              ? (teacherPhotoUrls.get(teacherPhotoPath) ?? null)
              : null,
          },
        };
      }),
    }));

    return { ...rest, teacherRequests, photoUrl };
  }

  async listMyTeachers(portalAccount: AuthenticatedPortalAccount) {
    const links = await this.prisma.studentTeacher.findMany({
      where: { student: { parentLeadId: portalAccount.leadId } },
      select: { teacher: { select: { id: true, name: true } } },
    });
    const distinct = new Map(links.map((l) => [l.teacher.id, l.teacher]));
    return [...distinct.values()];
  }

  async listMyMessageThreads(portalAccount: AuthenticatedPortalAccount) {
    const threads = await this.prisma.messageThread.findMany({
      where: { leadId: portalAccount.leadId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        teacher: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return threads.map(({ messages, teacher, ...thread }) => ({
      ...thread,
      teacherName: teacher.name,
      messages: messages.map((m) => redactRemovedMessage(m)),
      unreadCount: countUnread(messages, 'famille', thread.familyReadAt),
    }));
  }

  async startOrGetThread(portalAccount: AuthenticatedPortalAccount, dto: StartThreadDto) {
    const owns = await this.prisma.studentTeacher.findFirst({
      where: { teacherId: dto.teacherId, student: { parentLeadId: portalAccount.leadId } },
    });
    if (!owns) {
      throw new NotFoundException('Enseignant introuvable');
    }

    const existing = await this.prisma.messageThread.findFirst({
      where: { teacherId: dto.teacherId, leadId: portalAccount.leadId },
    });
    if (existing) return existing;

    return this.prisma.messageThread.create({
      data: {
        teacherId: dto.teacherId,
        leadId: portalAccount.leadId,
        familyName: portalAccount.familyName ?? 'Famille',
      },
    });
  }

  async sendMessage(
    portalAccount: AuthenticatedPortalAccount,
    threadId: string,
    dto: SendFamilyMessageDto,
  ) {
    const thread = await this.prisma.messageThread.findUnique({ where: { id: threadId } });
    if (!thread || thread.leadId !== portalAccount.leadId) {
      throw new NotFoundException('Conversation introuvable');
    }
    return this.prisma.message.create({
      data: { threadId, sender: 'famille', body: dto.body },
    });
  }

  async markThreadRead(portalAccount: AuthenticatedPortalAccount, threadId: string) {
    const thread = await this.prisma.messageThread.findUnique({ where: { id: threadId } });
    if (!thread || thread.leadId !== portalAccount.leadId) {
      throw new NotFoundException('Conversation introuvable');
    }
    await this.prisma.messageThread.update({
      where: { id: threadId },
      data: { familyReadAt: new Date() },
    });
    return { familyReadAt: new Date().toISOString() };
  }

  async getUnreadMessageCount(portalAccount: AuthenticatedPortalAccount) {
    const threads = await this.prisma.messageThread.findMany({
      where: { leadId: portalAccount.leadId },
      select: {
        familyReadAt: true,
        messages: { select: { sender: true, createdAt: true, removedAt: true } },
      },
    });
    const count = threads.reduce(
      (sum, t) => sum + countUnread(t.messages, 'famille', t.familyReadAt),
      0,
    );
    return { count };
  }
}
