import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { setSubjectCatalog } from '../common/subjects';

export const SUBJECT_CATEGORIES = ['scolaire', 'professionnel'] as const;
export type SubjectCategory = (typeof SUBJECT_CATEGORIES)[number];

const REFRESH_INTERVAL_MS = 60_000;

@Injectable()
export class SubjectsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SubjectsService.name);
  private timer?: NodeJS.Timeout;

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.refreshCatalog();
    this.timer = setInterval(() => {
      this.refreshCatalog().catch((error) =>
        this.logger.warn(`Rafraîchissement du catalogue des matières échoué : ${error}`),
      );
    }, REFRESH_INTERVAL_MS);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async refreshCatalog() {
    const subjects = await this.prisma.subject.findMany({ select: { name: true } });
    setSubjectCatalog(subjects.map((s) => s.name));
  }

  // Listes de choix (candidature, profils, attributions) : matieres actives.
  listActive() {
    return this.prisma.subject.findMany({
      where: { isActive: true },
      select: { name: true, category: true },
      orderBy: [{ category: 'desc' }, { name: 'asc' }],
    });
  }

  // Gestion (Super Admin) : toutes les matieres + nombre d'enseignants et de
  // candidats qui les ont choisies.
  async listAll() {
    const [subjects, teachers, applications] = await Promise.all([
      this.prisma.subject.findMany({ orderBy: [{ category: 'desc' }, { name: 'asc' }] }),
      this.prisma.teacher.findMany({ select: { subjects: true } }),
      this.prisma.teacherApplication.findMany({
        where: { status: { notIn: ['valide', 'refuse'] } },
        select: { subjects: true },
      }),
    ]);
    const count = (rows: { subjects: string[] }[], name: string) =>
      rows.filter((row) => row.subjects.includes(name)).length;
    return subjects.map((subject) => ({
      ...subject,
      teachersCount: count(teachers, subject.name),
      applicationsCount: count(applications, subject.name),
    }));
  }

  async create(name: string, category: SubjectCategory) {
    const clean = name.trim().replace(/\s+/g, ' ');
    const existing = await this.prisma.subject.findFirst({
      where: { name: { equals: clean, mode: 'insensitive' } },
    });
    if (existing) {
      throw new ConflictException(
        existing.isActive
          ? 'Cette matière existe déjà'
          : 'Cette matière existe déjà mais est masquée : réaffichez-la plutôt',
      );
    }
    const subject = await this.prisma.subject.create({ data: { name: clean, category } });
    await this.refreshCatalog();
    return subject;
  }

  async update(id: string, data: { category?: SubjectCategory; isActive?: boolean }) {
    await this.findOrThrow(id);
    const subject = await this.prisma.subject.update({ where: { id }, data });
    await this.refreshCatalog();
    return subject;
  }

  // Suppression definitive seulement si la matiere n'est utilisee nulle part
  // (sinon on la masque, pour ne pas rendre invalides des donnees existantes).
  async remove(id: string) {
    const subject = await this.findOrThrow(id);
    const name = subject.name;
    const [teachers, applications, requests, students, grades, sessions, assignments] =
      await Promise.all([
        this.prisma.teacher.count({ where: { subjects: { has: name } } }),
        this.prisma.teacherApplication.count({ where: { subjects: { has: name } } }),
        this.prisma.teacherRequest.count({ where: { subject: name } }),
        this.prisma.student.count({ where: { subjects: { has: name } } }),
        this.prisma.grade.count({ where: { subject: name } }),
        this.prisma.session.count({ where: { subject: name } }),
        this.prisma.studentTeacher.count({ where: { subject: name } }),
      ]);
    const used = teachers + applications + requests + students + grades + sessions + assignments;
    if (used > 0) {
      throw new BadRequestException(
        'Cette matière est déjà utilisée (enseignants, candidatures, élèves ou séances) : masquez-la plutôt que de la supprimer.',
      );
    }
    await this.prisma.subject.delete({ where: { id } });
    await this.refreshCatalog();
  }

  private async findOrThrow(id: string) {
    const subject = await this.prisma.subject.findUnique({ where: { id } });
    if (!subject) throw new NotFoundException('Matière introuvable');
    return subject;
  }
}
