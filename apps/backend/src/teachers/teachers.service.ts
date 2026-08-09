import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PhotosService } from '../photos/photos.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { ListTeachersQueryDto } from './dto/list-teachers-query.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';

@Injectable()
export class TeachersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly photos: PhotosService,
  ) {}

  async list(query: ListTeachersQueryDto) {
    const teachers = await this.prisma.teacher.findMany({
      where: query.verified === 'true' ? { verified: true } : undefined,
      orderBy: { name: 'asc' },
    });

    const photoUrls = await this.photos.signUrls(teachers.map((t) => t.photoPath));
    return teachers.map((teacher) => ({
      id: teacher.id,
      name: teacher.name,
      subjects: teacher.subjects,
      verified: teacher.verified,
      bio: teacher.bio,
      zone: teacher.zone,
      email: teacher.email,
      phone: teacher.phone,
      photoUrl: teacher.photoPath ? (photoUrls.get(teacher.photoPath) ?? null) : null,
    }));
  }

  async findOne(id: string) {
    const teacher = await this.prisma.teacher.findUnique({
      where: { id },
      include: {
        sessions: {
          orderBy: { date: 'desc' },
          include: {
            student: {
              select: {
                id: true,
                name: true,
                parentLead: {
                  select: { name: true, portalAccount: { select: { familyName: true } } },
                },
              },
            },
          },
        },
      },
    });
    if (!teacher) {
      throw new NotFoundException('Enseignant introuvable');
    }

    const photoUrl = await this.photos.signUrl(teacher.photoPath);
    const sessions = teacher.sessions.map(({ student, ...session }) => ({
      ...session,
      studentName: student.name,
      familyName:
        student.parentLead?.portalAccount?.familyName ?? student.parentLead?.name ?? 'Sans famille',
    }));

    return { ...teacher, sessions, photoUrl };
  }

  create(dto: CreateTeacherDto) {
    return this.prisma.teacher.create({
      data: {
        name: dto.name,
        subjects: dto.subjects ?? [],
        bio: dto.bio,
        zone: dto.zone,
        email: dto.email,
        phone: dto.phone,
        verified: true,
      },
    });
  }

  async update(id: string, dto: UpdateTeacherDto) {
    await this.findOneRaw(id);
    return this.prisma.teacher.update({ where: { id }, data: dto });
  }

  async setVerified(id: string, verified: boolean) {
    await this.findOneRaw(id);
    return this.prisma.teacher.update({ where: { id }, data: { verified } });
  }

  async remove(id: string) {
    const teacher = await this.findOneRaw(id);
    if (teacher.photoPath) {
      await this.photos.remove(teacher.photoPath);
    }
    await this.prisma.teacher.delete({ where: { id } });
  }

  async uploadPhoto(id: string, file: Express.Multer.File) {
    const teacher = await this.findOneRaw(id);
    if (teacher.photoPath) {
      await this.photos.remove(teacher.photoPath);
    }
    const path = this.photos.buildPath('teachers', id, file.originalname);
    await this.photos.upload(path, file);
    await this.prisma.teacher.update({ where: { id }, data: { photoPath: path } });
  }

  async removePhoto(id: string) {
    const teacher = await this.findOneRaw(id);
    if (teacher.photoPath) {
      await this.photos.remove(teacher.photoPath);
      await this.prisma.teacher.update({ where: { id }, data: { photoPath: null } });
    }
  }

  private async findOneRaw(id: string) {
    const teacher = await this.prisma.teacher.findUnique({ where: { id } });
    if (!teacher) {
      throw new NotFoundException('Enseignant introuvable');
    }
    return teacher;
  }
}
