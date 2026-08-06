import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PhotosService } from '../photos/photos.service';
import { AuthenticatedPortalAccount } from '../auth/portal-auth.guard';

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

  async listMyStudents(portalAccount: AuthenticatedPortalAccount) {
    const students = await this.prisma.student.findMany({
      where: { parentLeadId: portalAccount.leadId },
      select: {
        id: true,
        name: true,
        level: true,
        school: true,
        photoPath: true,
      },
      orderBy: { name: 'asc' },
    });

    const photoUrls = await this.photos.signUrls(
      students.map((s) => s.photoPath),
    );
    return students.map((student) => ({
      ...student,
      photoUrl: student.photoPath
        ? (photoUrls.get(student.photoPath) ?? null)
        : null,
    }));
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
            status: true,
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
      },
    });

    // 404 (pas 403) si l'élève n'existe pas OU n'appartient pas à ce compte —
    // ne pas révéler qu'un id appartient à quelqu'un d'autre.
    if (!student || student.parentLeadId !== portalAccount.leadId) {
      throw new NotFoundException('Élève introuvable');
    }

    const { photoPath, parentLeadId, ...rest } = student;
    const photoUrl = await this.photos.signUrl(photoPath);
    return { ...rest, photoUrl };
  }
}
