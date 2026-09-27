import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedPortalAccount } from '../auth/portal-auth.guard';
import { AdminNotificationService } from '../email/admin-notification.service';
import { UpsertReviewDto } from './dto/upsert-review.dto';

// Une famille peut noter un prof des qu'il a donne quelques seances a son
// enfant : assez pour se faire un avis, sans attendre la fin de la periode.
export const MIN_SESSIONS_FOR_REVIEW = 2;

const round1 = (n: number) => Math.round(n * 10) / 10;

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adminNotifications: AdminNotificationService,
  ) {}

  private async assertOwnStudent(portalAccount: AuthenticatedPortalAccount, studentId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, name: true, parentLeadId: true },
    });
    // 404 (pas 403) : ne pas reveler qu'un id appartient a quelqu'un d'autre.
    if (!student || student.parentLeadId !== portalAccount.leadId) {
      throw new NotFoundException('Élève introuvable');
    }
    return student;
  }

  // Profs de l'enfant (affectes ou ayant donne des seances), avec le nombre de
  // seances realisees, l'eligibilite et l'avis deja laisse.
  async listForFamily(portalAccount: AuthenticatedPortalAccount, studentId: string) {
    await this.assertOwnStudent(portalAccount, studentId);
    const [assignments, done, reviews] = await Promise.all([
      this.prisma.studentTeacher.findMany({
        where: { studentId },
        select: { teacherId: true, subject: true, teacher: { select: { id: true, name: true } } },
      }),
      this.prisma.session.groupBy({
        by: ['teacherId'],
        where: { studentId, status: 'realisee', teacherId: { not: null } },
        _count: { _all: true },
      }),
      this.prisma.teacherReview.findMany({ where: { studentId } }),
    ]);

    const teacherIds = new Set([
      ...assignments.map((a) => a.teacherId),
      ...done.map((d) => d.teacherId as string),
    ]);
    const names = new Map(assignments.map((a) => [a.teacherId, a.teacher.name]));
    const missing = [...teacherIds].filter((id) => !names.has(id));
    if (missing.length > 0) {
      const teachers = await this.prisma.teacher.findMany({
        where: { id: { in: missing } },
        select: { id: true, name: true },
      });
      teachers.forEach((t) => names.set(t.id, t.name));
    }

    return [...teacherIds].map((teacherId) => {
      const sessionsDone = done.find((d) => d.teacherId === teacherId)?._count._all ?? 0;
      const review = reviews.find((r) => r.teacherId === teacherId) ?? null;
      return {
        teacherId,
        teacherName: names.get(teacherId) ?? 'Enseignant',
        subjects: assignments.filter((a) => a.teacherId === teacherId && a.subject).map((a) => a.subject),
        sessionsDone,
        canReview: sessionsDone >= MIN_SESSIONS_FOR_REVIEW,
        review: review && {
          rating: review.rating,
          comment: review.comment,
          updatedAt: review.updatedAt,
        },
      };
    });
  }

  async upsertForFamily(
    portalAccount: AuthenticatedPortalAccount,
    studentId: string,
    teacherId: string,
    dto: UpsertReviewDto,
  ) {
    const student = await this.assertOwnStudent(portalAccount, studentId);
    const sessionsDone = await this.prisma.session.count({
      where: { studentId, teacherId, status: 'realisee' },
    });
    if (sessionsDone < MIN_SESSIONS_FOR_REVIEW) {
      throw new BadRequestException(
        `Vous pourrez donner votre avis après ${MIN_SESSIONS_FOR_REVIEW} séances réalisées avec cet enseignant.`,
      );
    }
    const teacher = await this.prisma.teacher.findUnique({ where: { id: teacherId }, select: { name: true } });
    if (!teacher) throw new NotFoundException('Enseignant introuvable');

    const comment = dto.comment?.trim() || null;
    const familyName =
      portalAccount.familyName?.trim() || portalAccount.fullName?.trim() || 'Famille';
    const existing = await this.prisma.teacherReview.findUnique({
      where: { studentId_teacherId: { studentId, teacherId } },
    });
    const review = await this.prisma.teacherReview.upsert({
      where: { studentId_teacherId: { studentId, teacherId } },
      create: { studentId, teacherId, rating: dto.rating, comment, familyName, studentName: student.name },
      update: { rating: dto.rating, comment, familyName, studentName: student.name },
    });

    // Avis negatif (nouveau ou degrade) : l'equipe est prevenue pour reagir vite.
    if (dto.rating <= 2 && (!existing || existing.rating > 2)) {
      this.adminNotifications.notify({
        subject: `Avis négatif sur ${teacher.name}`,
        title: `Avis ${dto.rating}/5 sur ${teacher.name}`,
        lines: [
          `Famille : ${familyName} (élève : ${student.name})`,
          comment ? `Commentaire : « ${comment} »` : 'Pas de commentaire.',
        ],
        path: `/enseignants/${teacherId}`,
      });
    }

    return { rating: review.rating, comment: review.comment, updatedAt: review.updatedAt };
  }

  // ------------------------------------------------------------------ admin

  async listForAdmin(teacherId: string) {
    const reviews = await this.prisma.teacherReview.findMany({
      where: { teacherId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        rating: true,
        comment: true,
        familyName: true,
        studentName: true,
        studentId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    const average = reviews.length ? round1(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) : null;
    const distribution = [5, 4, 3, 2, 1].map((stars) => ({
      stars,
      count: reviews.filter((r) => r.rating === stars).length,
    }));
    return { average, count: reviews.length, distribution, reviews };
  }
}
