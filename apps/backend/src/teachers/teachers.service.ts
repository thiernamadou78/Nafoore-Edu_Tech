import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PhotosService } from '../photos/photos.service';
import { GeocodingService } from '../geocoding/geocoding.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { ListTeachersQueryDto } from './dto/list-teachers-query.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';

@Injectable()
export class TeachersService {
  private readonly logger = new Logger(TeachersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly photos: PhotosService,
    private readonly geocoding: GeocodingService,
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
      address: teacher.address,
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
        documents: {
          include: { uploadedBy: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
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

  async create(dto: CreateTeacherDto) {
    const teacher = await this.prisma.teacher.create({
      data: {
        name: dto.name,
        subjects: dto.subjects ?? [],
        bio: dto.bio,
        address: dto.address,
        email: dto.email,
        phone: dto.phone,
        verified: true,
      },
    });
    if (dto.address) this.geocodeAndSave(teacher.id, dto.address);
    return teacher;
  }

  async update(id: string, dto: UpdateTeacherDto) {
    await this.findOneRaw(id);
    const teacher = await this.prisma.teacher.update({ where: { id }, data: dto });
    if (dto.address) this.geocodeAndSave(id, dto.address);
    return teacher;
  }

  // Best-effort, en tâche de fond : ne doit jamais retarder ni faire échouer
  // la création/mise à jour de l'enseignant.
  private geocodeAndSave(teacherId: string, address: string) {
    this.geocoding
      .geocode(address)
      .then((coords) => {
        if (!coords) return;
        return this.prisma.teacher.update({ where: { id: teacherId }, data: coords });
      })
      .catch((error) => this.logger.warn(`Géocodage de l'enseignant ${teacherId} échoué: ${error}`));
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
