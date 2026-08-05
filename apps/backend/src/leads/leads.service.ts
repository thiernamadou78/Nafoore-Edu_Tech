import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { AssignLeadDto } from './dto/assign-lead.dto';
import { ConvertToStudentDto } from './dto/convert-to-student.dto';
import { CreateLeadNoteDto } from './dto/create-lead-note.dto';
import { ListLeadsQueryDto } from './dto/list-leads-query.dto';
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto';

@Injectable()
export class LeadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLog: ActivityLogService,
  ) {}

  list(query: ListLeadsQueryDto) {
    const where: Prisma.LeadWhereInput = {
      profile: query.profile,
      status: query.status,
      createdAt:
        query.from || query.to
          ? {
              gte: query.from ? new Date(query.from) : undefined,
              lte: query.to ? new Date(query.to) : undefined,
            }
          : undefined,
    };

    return this.prisma.lead.findMany({
      where,
      include: {
        assignedTo: { select: { id: true, name: true } },
        portalAccount: { select: { id: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: {
        assignedTo: { select: { id: true, name: true } },
        notes: {
          include: { adminAccount: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'asc' },
        },
        students: { select: { id: true, name: true, level: true } },
        portalAccount: { select: { id: true, status: true } },
      },
    });
    if (!lead) {
      throw new NotFoundException('Lead introuvable');
    }
    return lead;
  }

  async addNote(id: string, dto: CreateLeadNoteDto, actorId: string) {
    await this.findOne(id);
    return this.prisma.leadNote.create({
      data: { leadId: id, adminAccountId: actorId, note: dto.note },
      include: { adminAccount: { select: { id: true, name: true } } },
    });
  }

  async updateStatus(id: string, dto: UpdateLeadStatusDto, actorId: string) {
    await this.findOne(id);

    const lead = await this.prisma.lead.update({
      where: { id },
      data: { status: dto.status },
      include: { assignedTo: { select: { id: true, name: true } } },
    });

    await this.activityLog.log(actorId, 'update_lead_status', 'leads', id);

    return lead;
  }

  async assign(id: string, dto: AssignLeadDto, actorId: string) {
    await this.findOne(id);
    await this.prisma.adminAccount.findUniqueOrThrow({
      where: { id: dto.assignedToId },
    });

    const lead = await this.prisma.lead.update({
      where: { id },
      data: { assignedToId: dto.assignedToId },
      include: { assignedTo: { select: { id: true, name: true } } },
    });

    await this.activityLog.log(actorId, 'assign_lead', 'leads', id);

    return lead;
  }

  async unassign(id: string, actorId: string) {
    await this.findOne(id);

    const lead = await this.prisma.lead.update({
      where: { id },
      data: { assignedToId: null },
      include: { assignedTo: { select: { id: true, name: true } } },
    });

    await this.activityLog.log(actorId, 'unassign_lead', 'leads', id);

    return lead;
  }

  async convertToStudent(
    id: string,
    dto: ConvertToStudentDto,
    actorId: string,
  ) {
    const existingLead = await this.findOne(id);

    const student = await this.prisma.$transaction(async (tx) => {
      const createdStudent = await tx.student.create({
        data: {
          name: existingLead.name,
          level: dto.level,
          parentLeadId: id,
        },
      });
      await tx.lead.update({ where: { id }, data: { status: 'converti' } });
      return createdStudent;
    });

    await this.activityLog.log(
      actorId,
      'convert_lead_to_student',
      'leads',
      id,
    );

    return student;
  }
}
