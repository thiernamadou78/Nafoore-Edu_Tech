import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { resolvePortalUrl } from '../email/portal-url.util';
import { renderRecurringScheduleUpdatedEmail } from '../email/templates/recurring-schedule-updated.template';
import { AuthenticatedTeacherAccount } from '../auth/teacher-auth.guard';
import { UpsertRecurringScheduleDto } from './dto/upsert-recurring-schedule.dto';
import { nextOccurrences, ScheduleSlot, slotsOverlap } from './recurring-schedule.util';
import { AvailabilityService } from './availability.service';
import { SessionChangesService } from '../session-changes/session-changes.service';

// Fenêtre glissante : combien de semaines de séances réelles sont
// matérialisées à l'avance à partir du planning récurrent. Le pointage QR
// s'appuie uniquement sur ces Session concrètes, jamais sur le planning lui-même.
const WEEKS_AHEAD = 8;

@Injectable()
export class RecurringScheduleService {
  private readonly logger = new Logger(RecurringScheduleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly availability: AvailabilityService,
    private readonly sessionChanges: SessionChangesService,
  ) {}

  async upsert(
    teacherAccount: AuthenticatedTeacherAccount,
    studentId: string,
    dto: UpsertRecurringScheduleDto,
    options: { startsOn?: Date } = {},
  ) {
    if (dto.slots.length !== dto.frequency) {
      throw new BadRequestException(
        `Le nombre de créneaux (${dto.slots.length}) doit correspondre à la fréquence (${dto.frequency})`,
      );
    }
    const teacherId = teacherAccount.teacherId as string;
    // Un prof peut avoir plusieurs matieres pour le meme eleve : on verifie
    // qu'il enseigne bien CETTE matiere precise a cet eleve.
    const assignment = await this.prisma.studentTeacher.findFirst({
      where: { studentId, teacherId, subject: dto.subject },
    });
    if (!assignment) {
      throw new BadRequestException("Tu n'enseignes pas cette matière à cet élève");
    }

    await this.availability.assertSlotsOk(
      studentId,
      teacherId,
      dto.subject,
      dto.slots,
      dto.confirmOutOfAvailability ?? false,
    );

    const existingSchedule = await this.prisma.recurringSchedule.findUnique({
      where: { studentId_teacherId_subject: { studentId, teacherId, subject: dto.subject } },
    });

    await this.assertNoScheduleConflict(teacherId, studentId, dto, existingSchedule?.id);

    const slots = dto.slots.map((s) => ({
      dayOfWeek: s.dayOfWeek,
      time: s.time,
    })) as unknown as Prisma.InputJsonValue;

    const schedule = await this.prisma.recurringSchedule.upsert({
      where: { studentId_teacherId_subject: { studentId, teacherId, subject: dto.subject } },
      create: {
        studentId,
        teacherId,
        frequency: dto.frequency,
        subject: dto.subject,
        durationMinutes: dto.durationMinutes ?? 60,
        slots,
        startsOn: options.startsOn ?? null,
        active: true,
      },
      update: {
        frequency: dto.frequency,
        durationMinutes: dto.durationMinutes ?? 60,
        slots,
        startsOn: options.startsOn ?? null,
        active: true,
      },
    });

    // On repart d'une base propre : les séances futures pas encore données
    // (planifiee/confirmee) issues de l'ancienne version du planning sont
    // supprimées, puis régénérées sur le nouveau rythme. L'historique
    // (séances déjà réalisées/annulées) n'est jamais touché.
    await this.prisma.session.deleteMany({
      where: {
        scheduleId: schedule.id,
        date: { gt: new Date() },
        status: { in: ['planifiee', 'confirmee'] },
      },
    });
    const sessionsCreated = await this.generateSessionsForSchedule(schedule.id);

    await this.notifyFamily(schedule.id);

    return { ...schedule, sessionsCreated };
  }

  // Arret du programme (motif obligatoire) : seances a venir retirees,
  // famille et admin prevenus — voir SessionChangesService.stopProgram.
  async remove(
    teacherAccount: AuthenticatedTeacherAccount,
    studentId: string,
    subject: string,
    reason: string,
  ) {
    const teacherId = teacherAccount.teacherId as string;
    const schedule = await this.prisma.recurringSchedule.findUnique({
      where: { studentId_teacherId_subject: { studentId, teacherId, subject } },
      include: { teacher: { select: { name: true } } },
    });
    if (!schedule || !schedule.active) {
      throw new NotFoundException('Aucun planning récurrent pour cette matière');
    }
    await this.sessionChanges.stopProgram(
      schedule.id,
      { kind: 'enseignant', name: schedule.teacher.name },
      reason,
    );
  }

  // Un prof ne peut pas donner deux cours en meme temps : on verifie ses
  // creneaux face a TOUS ses autres plannings actifs (autres eleves ET
  // autres matieres du meme eleve), jamais contre le planning qu'on est
  // justement en train de modifier.
  private async assertNoScheduleConflict(
    teacherId: string,
    studentId: string,
    dto: UpsertRecurringScheduleDto,
    existingScheduleId?: string,
  ) {
    const otherSchedules = await this.prisma.recurringSchedule.findMany({
      where: {
        teacherId,
        active: true,
        NOT: { studentId, subject: dto.subject },
      },
      include: { student: { select: { name: true } } },
    });

    const newDuration = dto.durationMinutes ?? 60;
    for (const other of otherSchedules) {
      const otherSlots = other.slots as unknown as ScheduleSlot[];
      for (const newSlot of dto.slots) {
        for (const otherSlot of otherSlots) {
          if (slotsOverlap(newSlot, newDuration, otherSlot, other.durationMinutes)) {
            throw new ConflictException(
              `Créneau déjà pris par le planning de ${other.student.name} (${other.subject})`,
            );
          }
        }
      }
    }

    // Les plannings recurrents d'AUTRES eleves ne couvrent pas les seances
    // ponctuelles ("Planifier" depuis le Planning) : sans ce controle, un
    // nouveau planning recurrent pouvait chevaucher une seance ponctuelle
    // deja posee, alors que l'inverse (poser une seance ponctuelle sur un
    // creneau recurrent existant) est deja bloque par assertNoConflict.
    const now = new Date();
    const lookupEnd = new Date(now.getTime() + WEEKS_AHEAD * 7 * 24 * 3_600_000);
    const upcomingSessions = await this.prisma.session.findMany({
      where: {
        teacherId,
        status: { not: 'annulee' },
        date: { gte: now, lte: lookupEnd },
        // Les seances deja generees par CE planning seront de toute facon
        // supprimees puis regenerees sur le nouveau rythme : pas de conflit
        // a chercher contre elles-memes.
        scheduleId: existingScheduleId ? { not: existingScheduleId } : undefined,
      },
      include: { student: { select: { name: true } } },
    });

    for (const slot of dto.slots) {
      for (const occurrence of nextOccurrences(slot, WEEKS_AHEAD, now)) {
        const occurrenceEnd = new Date(occurrence.getTime() + newDuration * 60_000);
        const conflict = upcomingSessions.find((session) => {
          const sessionEnd = new Date(session.date.getTime() + session.durationMinutes * 60_000);
          return occurrence < sessionEnd && session.date < occurrenceEnd;
        });
        if (conflict) {
          throw new ConflictException(
            `Créneau déjà pris le ${occurrence.toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })} par une séance avec ${conflict.student.name}`,
          );
        }
      }
    }
  }

  private async generateSessionsForSchedule(scheduleId: string): Promise<number> {
    const schedule = await this.prisma.recurringSchedule.findUnique({
      where: { id: scheduleId },
    });
    if (!schedule || !schedule.active) return 0;

    const slots = schedule.slots as unknown as ScheduleSlot[];
    const now = new Date();
    // La generation part de la 1ere seance (si elle est dans le futur) et
    // s'arrete a la fin de la periode d'accompagnement (ex : 1 mois).
    const from = schedule.startsOn && schedule.startsOn > now ? schedule.startsOn : now;
    const assignment = await this.prisma.studentTeacher.findFirst({
      where: {
        studentId: schedule.studentId,
        teacherId: schedule.teacherId,
        subject: schedule.subject,
      },
      select: { endsAt: true },
    });
    const until = assignment?.endsAt ?? null;

    // Sessions déjà générées dans la fenêtre à venir, pour ne pas dupliquer
    // en cas d'exécution répétée (upsert + cron de rattrapage).
    const existing = await this.prisma.session.findMany({
      where: { scheduleId, OR: [{ date: { gt: now } }, { rescheduledFrom: { gt: now } }] },
      select: { date: true, rescheduledFrom: true },
    });
    // Une seance deplacee "occupe" encore son creneau d'origine : sans ca,
    // elle serait recreee a l'ancienne date au prochain passage.
    const existingKeys = new Set(
      existing.flatMap((s) => [s.date.toISOString(), s.rescheduledFrom?.toISOString()]).filter(Boolean),
    );

    const toCreate = slots
      .flatMap((slot) => nextOccurrences(slot, WEEKS_AHEAD, from))
      .filter((date) => !existingKeys.has(date.toISOString()) && (!until || date <= until))
      .map((date) => ({
        studentId: schedule.studentId,
        teacherId: schedule.teacherId,
        scheduleId: schedule.id,
        subject: schedule.subject,
        date,
        durationMinutes: schedule.durationMinutes,
        status: 'planifiee',
      }));

    if (toCreate.length > 0) {
      await this.prisma.session.createMany({ data: toCreate });
    }
    return toCreate.length;
  }

  private async notifyFamily(scheduleId: string) {
    const schedule = await this.prisma.recurringSchedule.findUnique({
      where: { id: scheduleId },
      include: {
        student: {
          select: {
            name: true,
            parentLead: {
              select: { email: true, portalAccount: { select: { email: true } } },
            },
          },
        },
        teacher: { select: { name: true } },
      },
    });
    if (!schedule) return;

    const recipient =
      schedule.student.parentLead?.portalAccount?.email ?? schedule.student.parentLead?.email;
    if (!recipient) return;

    const html = renderRecurringScheduleUpdatedEmail({
      studentName: schedule.student.name,
      teacherName: schedule.teacher.name,
      frequency: schedule.frequency,
      slots: schedule.slots as unknown as ScheduleSlot[],
      portalUrl: resolvePortalUrl('famille'),
    });

    try {
      await this.emailService.send({
        to: recipient,
        subject: `Nafoore Education — Planning mis à jour pour ${schedule.student.name}`,
        html,
      });
    } catch (sendError) {
      this.logger.error(
        `Échec d'envoi de l'email de planning pour ${schedule.student.name}`,
        sendError instanceof Error ? sendError.stack : undefined,
      );
    }
  }

  // Rattrapage hebdomadaire : garde la fenêtre glissante toujours pleine
  // pour tous les plannings actifs (au cas où l'upsert initial n'aurait
  // couvert qu'une fenêtre déjà partiellement consommée).
  @Cron(CronExpression.EVERY_WEEK)
  async topUpAllSchedules() {
    const schedules = await this.prisma.recurringSchedule.findMany({
      where: { active: true },
      select: { id: true },
    });
    for (const { id } of schedules) {
      await this.generateSessionsForSchedule(id);
    }
    if (schedules.length > 0) {
      this.logger.log(`Fenêtre de séances rafraîchie pour ${schedules.length} planning(s) récurrent(s)`);
    }
  }
}
