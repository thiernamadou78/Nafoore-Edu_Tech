import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PhotosService } from '../photos/photos.service';
import { AssignTeachersDto } from './dto/assign-teachers.dto';
import { CreateStudentDto } from './dto/create-student.dto';
import { ListStudentsQueryDto } from './dto/list-students-query.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { StudentDocumentsService } from './student-documents.service';

const teacherSelect = {
  teacher: { select: { id: true, name: true, subjects: true } },
};

@Injectable()
export class StudentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly photos: PhotosService,
    private readonly studentDocuments: StudentDocumentsService,
  ) {}

  async list(query: ListStudentsQueryDto) {
    const where: Prisma.StudentWhereInput = {
      level: query.level,
      subjects: query.subject ? { has: query.subject } : undefined,
    };

    const students = await this.prisma.student.findMany({
      where,
      include: { teachers: { select: teacherSelect } },
      orderBy: { createdAt: 'desc' },
    });

    const photoUrls = await this.photos.signUrls(students.map((s) => s.photoPath));
    return students.map((student) => ({
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
          include: { teacher: { select: { id: true, name: true } } },
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
      },
    });
    if (!student) {
      throw new NotFoundException('Élève introuvable');
    }
    const photoUrl = await this.photos.signUrl(student.photoPath);
    return { ...student, photoUrl };
  }

  create(dto: CreateStudentDto) {
    return this.prisma.student.create({
      data: {
        name: dto.name,
        level: dto.level,
        school: dto.school,
        address: dto.address,
        subjects: dto.subjects ?? [],
        objectives: dto.objectives,
        parentLeadId: dto.parentLeadId,
      },
    });
  }

  async update(id: string, dto: UpdateStudentDto) {
    await this.findOneRaw(id);
    return this.prisma.student.update({ where: { id }, data: dto });
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
      select: { teacherId: true },
    });
    const currentIds = current.map((c) => c.teacherId);
    const nextIds = dto.teacherIds;
    const added = nextIds.filter((teacherId) => !currentIds.includes(teacherId));
    const removed = currentIds.filter((teacherId) => !nextIds.includes(teacherId));

    await this.prisma.$transaction([
      this.prisma.studentTeacher.deleteMany({ where: { studentId: id } }),
      this.prisma.studentTeacher.createMany({
        data: nextIds.map((teacherId) => ({ studentId: id, teacherId })),
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

  async uploadPhoto(id: string, file: Express.Multer.File) {
    const student = await this.findOneRaw(id);
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
