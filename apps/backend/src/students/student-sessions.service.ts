import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';

const teacherSelect = { teacher: { select: { id: true, name: true } } };

@Injectable()
export class StudentSessionsService {
  constructor(private readonly prisma: PrismaService) {}

  list(studentId: string) {
    return this.prisma.session.findMany({
      where: { studentId },
      include: teacherSelect,
      orderBy: { date: 'desc' },
    });
  }

  create(studentId: string, dto: CreateSessionDto) {
    return this.prisma.session.create({
      data: {
        studentId,
        teacherId: dto.teacherId,
        date: new Date(dto.date),
        subject: dto.subject,
        status: dto.status ?? 'planifiee',
        notes: dto.notes,
      },
      include: teacherSelect,
    });
  }

  async update(studentId: string, sessionId: string, dto: UpdateSessionDto) {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, studentId },
    });
    if (!session) {
      throw new NotFoundException('Séance introuvable');
    }
    return this.prisma.session.update({
      where: { id: sessionId },
      data: dto,
      include: teacherSelect,
    });
  }
}
