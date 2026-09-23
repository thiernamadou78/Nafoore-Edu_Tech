import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedAdmin } from '../auth/supabase-auth.guard';
import { ZoneService } from '../auth/zone.service';
import { PhotosService } from '../photos/photos.service';
import { GeocodingService } from '../geocoding/geocoding.service';
import { AssignTeachersDto } from './dto/assign-teachers.dto';
import { CreateStudentDto } from './dto/create-student.dto';
import { ListStudentsQueryDto } from './dto/list-students-query.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { generateQrToken } from './qr-token.util';
import { StudentDocumentsService } from './student-documents.service';

const teacherSelect = {
  id: true,
  subject: true,
  hourlyRate: true,
  teacher: { select: { id: true, name: true, subjects: true } },
};

@Injectable()
export class StudentsService {
  private readonly logger = new Logger(StudentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly zone: ZoneService,
    private readonly photos: PhotosService,
    private readonly studentDocuments: StudentDocumentsService,
    private readonly geocoding: GeocodingService,
  ) {}

  async list(query: ListStudentsQueryDto, admin: AuthenticatedAdmin) {
    const zoneWhere = await this.zone.where(admin, 'student');
    const where: Prisma.StudentWhereInput = {
      AND: zoneWhere ? [zoneWhere] : [],
      level: query.level,
      subjects: query.subject ? { has: query.subject } : undefined,
    };

    const students = await this.prisma.student.findMany({
      where,
      include: { teachers: { select: teacherSelect } },
      orderBy: { createdAt: 'desc' },
    });

    const photoUrls = await this.photos.signUrls(students.map((s) => s.photoPath));
    // qrToken est le "mot de passe" du pass éducatif : jamais exposé en liste,
    // uniquement dans findOne() (déjà réservé à super_admin/admin).
    return students.map(({ qrToken, ...student }) => ({
      ...student,
      photoUrl: student.photoPath ? (photoUrls.get(student.photoPath) ?? null) : null,
    }));
  }

  async findOne(id: string) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      include: {
        parentLead: { select: { id: true, name: true, profile: true } },
        teachers: { select: teacherSelect },
        sessions: {
          include: {
            teacher: { select: { id: true, name: true } },
            attendanceLogs: {
              select: { checkinAt: true, checkoutAt: true, method: true },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
          orderBy: { date: 'desc' },
        },
        progressReports: {
          include: { adminAccount: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
        },
        documents: {
          include: { uploadedBy: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
        },
        teacherHistory: {
          include: {
            teacher: { select: { id: true, name: true } },
            adminAccount: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        progressEntries: {
          include: {
            adminAccount: { select: { name: true } },
            teacher: { select: { name: true } },
          },
          orderBy: { subject: 'asc' },
        },
        attendanceLogs: {
          include: {
            teacher: { select: { id: true, name: true } },
            session: { select: { id: true, date: true, subject: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        fundingLinks: {
          where: { status: 'active' },
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            employee: {
              include: {
                contract: { select: { dateDebut: true, dateExpiration: true } },
              },
            },
          },
        },
        recurringSchedules: {
          where: { active: true },
          include: { teacher: { select: { id: true, name: true } } },
        },
      },
    });
    if (!student) {
      throw new NotFoundException('Élève introuvable');
    }
    const photoUrl = await this.photos.signUrl(student.photoPath);
    return { ...student, photoUrl };
  }

  async create(dto: CreateStudentDto) {
    const student = await this.prisma.student.create({
      data: {
        name: dto.name,
        level: dto.level,
        classe: dto.classe,
        school: dto.school,
        address: dto.address,
        postalCode: dto.postalCode,
        city: dto.city,
        dateNaissance: dto.dateNaissance ? new Date(dto.dateNaissance) : undefined,
        subjects: dto.subjects ?? [],
        objectives: dto.objectives,
        parentLeadId: dto.parentLeadId,
        qrToken: generateQrToken(),
      },
    });
    if (dto.address) this.geocodeAndSave(student.id, dto.address, dto.postalCode);
    return student;
  }

  // Best-effort, en tâche de fond : ne doit jamais retarder ni faire échouer
  // la création/mise à jour de l'élève.
  private geocodeAndSave(studentId: string, address: string, postalCode?: string) {
    this.geocoding
      .geocode(address, postalCode)
      .then((coords) => {
        if (!coords) return;
        return this.prisma.student.update({ where: { id: studentId }, data: coords });
      })
      .catch((error) => this.logger.warn(`Géocodage de l'élève ${studentId} échoué: ${error}`));
  }

  async regenerateQrToken(id: string) {
    await this.findOneRaw(id);
    return this.prisma.student.update({
      where: { id },
      data: { qrToken: generateQrToken(), passStatus: 'active' },
    });
  }

  async setPassStatus(id: string, passStatus: string) {
    await this.findOneRaw(id);
    return this.prisma.student.update({ where: { id }, data: { passStatus } });
  }

  async update(id: string, dto: UpdateStudentDto) {
    await this.findOneRaw(id);
    const student = await this.prisma.student.update({ where: { id }, data: dto });
    if (dto.address) this.geocodeAndSave(id, dto.address, dto.postalCode);
    return student;
  }

  async setActive(id: string, isActive: boolean) {
    await this.findOneRaw(id);
    return this.prisma.student.update({ where: { id }, data: { isActive } });
  }

  async remove(id: string) {
    const student = await this.findOneRaw(id);

    if (student.photoPath) {
      await this.photos.remove(student.photoPath);
    }

    const documents = await this.prisma.studentDocument.findMany({
      where: { studentId: id },
      select: { id: true },
    });
    for (const document of documents) {
      await this.studentDocuments.remove(id, document.id);
    }

    await this.prisma.student.delete({ where: { id } });
  }

  async assignTeachers(id: string, dto: AssignTeachersDto, actorId: string) {
    await this.findOneRaw(id);

    const current = await this.prisma.studentTeacher.findMany({
      where: { studentId: id },
      select: { id: true, teacherId: true, subject: true },
    });

    const desired = dto.assignments.flatMap((a) =>
      a.subjects.map((subject) => ({ teacherId: a.teacherId, subject })),
    );
    const pairKey = (p: { teacherId: string; subject: string | null }) =>
      `${p.teacherId}::${p.subject ?? ''}`;
    const desiredKeys = new Set(desired.map(pairKey));
    const currentKeys = new Set(current.map(pairKey));

    // Diff par (prof, matiere) et non par prof seul : un prof qui garde une
    // matiere ne doit jamais perdre son planning recurrent pour celle-ci en
    // route, meme si d'autres matieres/profs changent dans la meme sauvegarde.
    const toDeleteIds = current.filter((c) => !desiredKeys.has(pairKey(c))).map((c) => c.id);
    const toCreate = desired.filter((d) => !currentKeys.has(pairKey(d)));

    const currentTeacherIds = new Set(current.map((c) => c.teacherId));
    const desiredTeacherIds = new Set(desired.map((d) => d.teacherId));
    const added = [...desiredTeacherIds].filter((t) => !currentTeacherIds.has(t));
    const removed = [...currentTeacherIds].filter((t) => !desiredTeacherIds.has(t));

    await this.prisma.$transaction([
      this.prisma.studentTeacher.deleteMany({ where: { id: { in: toDeleteIds } } }),
      this.prisma.studentTeacher.createMany({
        data: toCreate.map((p) => ({ studentId: id, teacherId: p.teacherId, subject: p.subject })),
      }),
      this.prisma.studentTeacherHistory.createMany({
        data: [
          ...added.map((teacherId) => ({
            studentId: id,
            teacherId,
            action: 'assigned',
            adminAccountId: actorId,
          })),
          ...removed.map((teacherId) => ({
            studentId: id,
            teacherId,
            action: 'unassigned',
            adminAccountId: actorId,
          })),
        ],
      }),
    ]);

    return this.prisma.student.findUniqueOrThrow({
      where: { id },
      include: { teachers: { select: teacherSelect } },
    });
  }

  async setAssignmentRate(studentId: string, assignmentId: string, hourlyRate: number) {
    const assignment = await this.prisma.studentTeacher.findFirst({
      where: { id: assignmentId, studentId },
    });
    if (!assignment) {
      throw new NotFoundException('Accompagnement introuvable');
    }
    await this.prisma.studentTeacher.update({ where: { id: assignmentId }, data: { hourlyRate } });
    return { hourlyRate };
  }

  // Assignation additive et idempotente, distincte de assignTeachers (full-replace
  // admin) — utilisée par le flux de matching famille pour ne pas toucher aux
  // autres enseignants déjà assignés à l'élève.
  async addTeacherAssignment(
    studentId: string,
    teacherId: string,
    actorId: string,
    subject: string | null = null,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
    endsAt: Date | null = null,
    hourlyRate: number | null = null,
  ) {
    const existing = await tx.studentTeacher.findFirst({
      where: { studentId, teacherId, subject },
    });
    if (existing) {
      // Meme prof re-choisi : la nouvelle periode remplace l'ancienne.
      if (endsAt || hourlyRate) {
        await tx.studentTeacher.update({
          where: { id: existing.id },
          data: { endsAt: endsAt ?? undefined, hourlyRate: hourlyRate ?? undefined },
        });
      }
      return;
    }

    await tx.studentTeacher.create({
      data: { studentId, teacherId, subject, endsAt, hourlyRate },
    });
    await tx.studentTeacherHistory.create({
      data: { studentId, teacherId, action: 'assigned', adminAccountId: actorId },
    });
  }

  async uploadPhoto(id: string, file: Express.Multer.File) {
    const student = await this.findOneRaw(id);
    this.photos.assertImage(file);
    if (student.photoPath) {
      await this.photos.remove(student.photoPath);
    }
    const path = this.photos.buildPath('students', id, file.originalname);
    await this.photos.upload(path, file);
    await this.prisma.student.update({ where: { id }, data: { photoPath: path } });
  }

  async removePhoto(id: string) {
    const student = await this.findOneRaw(id);
    if (student.photoPath) {
      await this.photos.remove(student.photoPath);
      await this.prisma.student.update({ where: { id }, data: { photoPath: null } });
    }
  }

  private async findOneRaw(id: string) {
    const student = await this.prisma.student.findUnique({ where: { id } });
    if (!student) {
      throw new NotFoundException('Élève introuvable');
    }
    return student;
  }
}
