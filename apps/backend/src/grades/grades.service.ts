import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedTeacherAccount } from '../auth/teacher-auth.guard';
import { AuthenticatedPortalAccount } from '../auth/portal-auth.guard';
import { CreateGradeDto } from './dto/create-grade.dto';

const round1 = (n: number) => Math.round(n * 10) / 10;
const mean = (values: number[]) => values.reduce((sum, v) => sum + v, 0) / values.length;
const on20 = (grade: { value: number; scale: number }) => (grade.value / grade.scale) * 20;
const monthKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

@Injectable()
export class GradesService {
  constructor(private readonly prisma: PrismaService) {}

  // Progression = moyenne des notes "de depart" comparee a la moyenne du
  // dernier mois avec des evaluations "de suivi", matiere par matiere (toutes
  // notes ramenees sur 20).
  async computeProgress(studentId: string) {
    const grades = await this.prisma.grade.findMany({
      where: { studentId },
      orderBy: { evaluatedAt: 'asc' },
      include: { teacher: { select: { name: true } } },
    });

    const bySubject = new Map<string, typeof grades>();
    for (const grade of grades) {
      if (!bySubject.has(grade.subject)) bySubject.set(grade.subject, []);
      bySubject.get(grade.subject)?.push(grade);
    }

    const subjects = [...bySubject.entries()].map(([subject, list]) => {
      const depart = list.filter((g) => g.kind === 'depart');
      const suivi = list.filter((g) => g.kind === 'suivi');

      const byMonth = new Map<string, number[]>();
      for (const grade of suivi) {
        const key = monthKey(grade.evaluatedAt);
        if (!byMonth.has(key)) byMonth.set(key, []);
        byMonth.get(key)?.push(on20(grade));
      }
      const months = [...byMonth.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, values]) => ({ month, average: round1(mean(values)), count: values.length }));

      const baselineAverage = depart.length > 0 ? round1(mean(depart.map(on20))) : null;
      const latest = months[months.length - 1] ?? null;
      const delta =
        baselineAverage !== null && latest ? round1(latest.average - baselineAverage) : null;

      return {
        subject,
        baselineAverage,
        months,
        latestAverage: latest?.average ?? null,
        delta,
        grades: list
          .slice()
          .reverse()
          .map((g) => ({
            id: g.id,
            kind: g.kind,
            value: g.value,
            scale: g.scale,
            evaluatedAt: g.evaluatedAt,
            comment: g.comment,
            teacherName: g.teacher?.name ?? null,
          })),
      };
    });

    const comparable = subjects.filter((s) => s.baselineAverage !== null && s.latestAverage !== null);
    const overall =
      comparable.length > 0
        ? {
            baselineAverage: round1(mean(comparable.map((s) => s.baselineAverage as number))),
            latestAverage: round1(mean(comparable.map((s) => s.latestAverage as number))),
            delta: round1(
              mean(comparable.map((s) => s.latestAverage as number)) -
                mean(comparable.map((s) => s.baselineAverage as number)),
            ),
          }
        : null;

    return { subjects, overall };
  }

  async hasBaseline(studentId: string, subject: string) {
    const count = await this.prisma.grade.count({
      where: { studentId, subject, kind: 'depart' },
    });
    return count > 0;
  }

  // ------------------------------------------------------------------ prof

  private async assertTeacherOfStudent(
    teacherAccount: AuthenticatedTeacherAccount,
    studentId: string,
  ) {
    if (!teacherAccount.teacherId) throw new NotFoundException('Élève introuvable');
    const assignment = await this.prisma.studentTeacher.findFirst({
      where: { studentId, teacherId: teacherAccount.teacherId },
    });
    if (!assignment) throw new NotFoundException('Élève introuvable');
  }

  async progressForTeacher(teacherAccount: AuthenticatedTeacherAccount, studentId: string) {
    await this.assertTeacherOfStudent(teacherAccount, studentId);
    return this.computeProgress(studentId);
  }

  async addGrade(
    teacherAccount: AuthenticatedTeacherAccount,
    studentId: string,
    dto: CreateGradeDto,
  ) {
    await this.assertTeacherOfStudent(teacherAccount, studentId);
    if (dto.value > dto.scale) {
      throw new BadRequestException('La note ne peut pas dépasser le barème');
    }
    const evaluatedAt = new Date(dto.evaluatedAt);
    if (evaluatedAt.getTime() > Date.now() + 86_400_000) {
      throw new BadRequestException("La date de l'évaluation ne peut pas être dans le futur");
    }

    return this.prisma.grade.create({
      data: {
        studentId,
        teacherId: teacherAccount.teacherId,
        subject: dto.subject,
        kind: dto.kind,
        value: dto.value,
        scale: dto.scale,
        evaluatedAt,
        comment: dto.comment?.trim() || null,
      },
    });
  }

  async deleteGrade(teacherAccount: AuthenticatedTeacherAccount, gradeId: string) {
    const grade = await this.prisma.grade.findUnique({ where: { id: gradeId } });
    if (!grade || !teacherAccount.teacherId || grade.teacherId !== teacherAccount.teacherId) {
      throw new NotFoundException('Note introuvable');
    }
    await this.prisma.grade.delete({ where: { id: gradeId } });
  }

  // ---------------------------------------------------------------- famille

  async progressForFamily(portalAccount: AuthenticatedPortalAccount, studentId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { parentLeadId: true },
    });
    // 404 (pas 403) : ne pas reveler qu'un id appartient a quelqu'un d'autre.
    if (!student || student.parentLeadId !== portalAccount.leadId) {
      throw new NotFoundException('Élève introuvable');
    }
    return this.computeProgress(studentId);
  }
}
