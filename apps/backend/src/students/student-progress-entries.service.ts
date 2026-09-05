import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertProgressEntryDto } from './dto/upsert-progress-entry.dto';

@Injectable()
export class StudentProgressEntriesService {
  constructor(private readonly prisma: PrismaService) {}

  list(studentId: string) {
    return this.prisma.progressEntry.findMany({
      where: { studentId },
      include: {
        adminAccount: { select: { name: true } },
        teacher: { select: { name: true } },
      },
      orderBy: { subject: 'asc' },
    });
  }

  upsert(studentId: string, dto: UpsertProgressEntryDto, actorId: string) {
    return this.prisma.progressEntry.upsert({
      where: { studentId_subject: { studentId, subject: dto.subject } },
      create: {
        studentId,
        subject: dto.subject,
        status: dto.status,
        adminAccountId: actorId,
      },
      update: {
        status: dto.status,
        adminAccountId: actorId,
        teacherId: null,
      },
    });
  }
}
