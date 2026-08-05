import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { CreateTeacherApplicationDto } from './dto/create-teacher-application.dto';
import { ListTeacherApplicationsQueryDto } from './dto/list-teacher-applications-query.dto';

@Injectable()
export class TeacherApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLog: ActivityLogService,
  ) {}

  list(query: ListTeacherApplicationsQueryDto) {
    const where: Prisma.TeacherApplicationWhereInput = {
      status: query.status,
      zone: query.zone ? { equals: query.zone, mode: 'insensitive' } : undefined,
      subjects: query.subject ? { has: query.subject } : undefined,
      reviewedById: query.reviewedBy,
    };

    return this.prisma.teacherApplication.findMany({
      where,
      include: { reviewedBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const application = await this.prisma.teacherApplication.findUnique({
      where: { id },
      include: { reviewedBy: { select: { id: true, name: true } } },
    });
    if (!application) {
      throw new NotFoundException('Candidature introuvable');
    }
    return application;
  }

  create(dto: CreateTeacherApplicationDto) {
    return this.prisma.teacherApplication.create({ data: dto });
  }

  async scheduleInterview(id: string, interviewDate: string, actorId: string) {
    await this.findOne(id);

    const application = await this.prisma.teacherApplication.update({
      where: { id },
      data: {
        interviewDate: new Date(interviewDate),
        status: 'entretien_planifie',
        reviewedById: actorId,
      },
    });

    await this.activityLog.log(
      actorId,
      'schedule_teacher_interview',
      'teacher_applications',
      id,
    );

    return application;
  }

  async updateNotes(id: string, interviewNotes: string, actorId: string) {
    const existing = await this.findOne(id);
    const nextStatus =
      existing.status === 'preselection' || existing.status === 'entretien_planifie'
        ? 'entretien_realise'
        : existing.status;

    const application = await this.prisma.teacherApplication.update({
      where: { id },
      data: { interviewNotes, status: nextStatus, reviewedById: actorId },
    });

    await this.activityLog.log(
      actorId,
      'update_teacher_application_notes',
      'teacher_applications',
      id,
    );

    return application;
  }

  async decide(
    id: string,
    status: 'valide' | 'refuse' | 'documents_requis',
    actorId: string,
  ) {
    const existing = await this.findOne(id);

    const application = await this.prisma.$transaction(async (tx) => {
      let createdTeacherId = existing.createdTeacherId;

      if (status === 'valide' && !createdTeacherId) {
        const teacher = await tx.teacher.create({
          data: {
            name: existing.candidateName,
            subjects: existing.subjects,
            verified: true,
          },
        });
        createdTeacherId = teacher.id;
      } else if (status === 'valide' && createdTeacherId) {
        await tx.teacher.update({
          where: { id: createdTeacherId },
          data: { verified: true },
        });
      }

      return tx.teacherApplication.update({
        where: { id },
        data: {
          status,
          decidedAt: new Date(),
          reviewedById: actorId,
          createdTeacherId,
        },
      });
    });

    await this.activityLog.log(
      actorId,
      `decide_teacher_application_${status}`,
      'teacher_applications',
      id,
    );

    return application;
  }
}
