import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { resolvePortalUrl } from '../email/portal-url.util';
import { renderRecurringScheduleUpdatedEmail } from '../email/templates/recurring-schedule-updated.template';
import { AuthenticatedTeacherAccount } from '../auth/teacher-auth.guard';
import { UpsertRecurringScheduleDto } from './dto/upsert-recurring-schedule.dto';
import { nextOccurrences, ScheduleSlot } from './recurring-schedule.util';

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
  ) {}

  async upsert(
    teacherAccount: AuthenticatedTeacherAccount,
    studentId: string,
    dto: UpsertRecurringScheduleDto,
  ) {
    if (dto.slots.length !== dto.frequency) {
      throw new BadRequestException(
        `Le nombre de créneaux (${dto.slots.length}) doit correspondre à la fréquence (${dto.frequency})`,
      );
    }
    const teacherId = teacherAccount.teacherId as string;
    const assignment = await this.prisma.studentTeacher.findFirst({
      where: { studentId, teacherId },
    });
    if (!assignment) {
      throw new BadRequestException("Tu n'enseignes pas à cet élève");
    }

    const slots = dto.slots.map((s) => ({
      dayOfWeek: s.dayOfWeek,
      time: s.time,
    })) as unknown as Prisma.InputJsonValue;

    const schedule = await this.prisma.recurringSchedule.upsert({
      where: { studentId_teacherId: { studentId, teacherId } },
      create: {
        studentId,
        teacherId,
        frequency: dto.frequency,
        subject: dto.subject,
        durationMinutes: dto.durationMinutes ?? 60,
        slots,
        active: true,
      },
      update: {
        frequency: dto.frequency,
        subject: dto.subject,
        durationMinutes: dto.durationMinutes ?? 60,
        slots,
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
    await this.generateSessionsForSchedule(schedule.id);

    await this.notifyFamily(schedule.id);

    return this.findForStudentAndTeacher(studentId, teacherId);
  }

  async remove(teacherAccount: AuthenticatedTeacherAccount, studentId: string) {
    const teacherId = teacherAccount.teacherId as string;
    const schedule = await this.prisma.recurringSchedule.findUnique({
      where: { studentId_teacherId: { studentId, teacherId } },
    });
    if (!schedule) {
      throw new NotFoundException('Aucun planning récurrent pour cet élève');
    }

    await this.prisma.session.deleteMany({
      where: {
        scheduleId: schedule.id,
        date: { gt: new Date() },
        status: { in: ['planifiee', 'confirmee'] },
      },
    });
    await this.prisma.recurringSchedule.update({
      where: { id: schedule.id },
      data: { active: false },
    });
  }

  private async findForStudentAndTeacher(studentId: string, teacherId: string) {
    return this.prisma.recurringSchedule.findUnique({
      where: { studentId_teacherId: { studentId, teacherId } },
    });
  }

  private async generateSessionsForSchedule(scheduleId: string) {
    const schedule = await this.prisma.recurringSchedule.findUnique({
      where: { id: scheduleId },
    });
    if (!schedule || !schedule.active) return;

    const slots = schedule.slots as unknown as ScheduleSlot[];
    const now = new Date();

    // Sessions déjà générées dans la fenêtre à venir, pour ne pas dupliquer
    // en cas d'exécution répétée (upsert + cron de rattrapage).
    const existing = await this.prisma.session.findMany({
      where: { scheduleId, date: { gt: now } },
      select: { date: true },
    });
    const existingKeys = new Set(existing.map((s) => s.date.toISOString()));

    const toCreate = slots
      .flatMap((slot) => nextOccurrences(slot, WEEKS_AHEAD, now))
      .filter((date) => !existingKeys.has(date.toISOString()))
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
