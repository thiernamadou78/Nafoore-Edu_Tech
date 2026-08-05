import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProgressReportDto } from './dto/create-progress-report.dto';

const authorSelect = { adminAccount: { select: { id: true, name: true } } };

@Injectable()
export class StudentProgressReportsService {
  constructor(private readonly prisma: PrismaService) {}

  list(studentId: string) {
    return this.prisma.progressReport.findMany({
      where: { studentId },
      include: authorSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  create(studentId: string, dto: CreateProgressReportDto, actorId: string) {
    return this.prisma.progressReport.create({
      data: {
        studentId,
        adminAccountId: actorId,
        period: dto.period,
        content: dto.content,
        shareable: dto.shareable ?? false,
      },
      include: authorSelect,
    });
  }
}
