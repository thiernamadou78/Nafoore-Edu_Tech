import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { AdminUpsertScheduleDto, CancelSessionDto, RescheduleSessionDto } from './dto/admin-session-change.dto';
import { SessionNotifierService } from '../email/session-notifier.service';
import { EmailService } from '../email/email.service';
import { renderNoticeEmail } from '../email/templates/notice.template';
import { resolvePortalUrl } from '../email/portal-url.util';
import { SessionChangesService } from '../session-changes/session-changes.service';
import { assertNoTeacherConflict } from '../session-changes/session-conflict';
import { AvailabilityService } from '../teacher/availability.service';
import { RecurringScheduleService } from '../teacher/recurring-schedule.service';
import { AuthenticatedTeacherAccount } from '../auth/teacher-auth.guard';
import { zonedParts } from '../common/timezone';

const teacherSelect = { teacher: { select: { id: true, name: true } } };

const DAY_LABELS = ['', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

// Creneau hebdomadaire (jour + heure) d'une date, dans le fuseau de la
// plateforme : sert au controle des disponibilites.
function slotOf(date: Date) {
  const local = zonedParts(date);
  return {
    dayOfWeek: local.weekday,
    time: `${String(local.hour).padStart(2, '0')}:${String(local.minute).padStart(2, '0')}`,
  };
}

// Planification des seances par l'equipe Nafoore (fiche eleve et planning
// global) : memes controles que cote enseignant (conflit de creneau bloquant,
// disponibilites a confirmer) et memes emails aux familles et enseignants.
@Injectable()
export class StudentSessionsService {
  private readonly logger = new Logger(StudentSessionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionNotifier: SessionNotifierService,
    private readonly sessionChanges: SessionChangesService,
    private readonly availability: AvailabilityService,
    private readonly recurringSchedule: RecurringScheduleService,
    private readonly emailService: EmailService,
  ) {}

  list(studentId: string) {
    return this.prisma.session.findMany({
      where: { studentId },
      include: teacherSelect,
      orderBy: { date: 'desc' },
    });
  }

  async create(studentId: string, dto: CreateSessionDto) {
    const date = new Date(dto.date);
    const status = dto.status ?? 'planifiee';
    const durationMinutes = dto.durationMinutes ?? 60;
    const upcoming = date > new Date() && ['planifiee', 'confirmee'].includes(status);

    if (upcoming && dto.teacherId) {
      await assertNoTeacherConflict(this.prisma, dto.teacherId, date, durationMinutes);
      if (dto.subject) {
        await this.availability.assertSlotsOk(
          studentId,
          dto.teacherId,
          dto.subject,
          [slotOf(date)],
          dto.confirmOutOfAvailability ?? false,
        );
      }
    }

    const session = await this.prisma.session.create({
      data: {
        studentId,
        teacherId: dto.teacherId,
        date,
        durationMinutes,
        subject: dto.subject,
        status,
        notes: dto.notes,
      },
      include: teacherSelect,
    });
    // Seule une seance a venir est "planifiee" pour la famille ; un
    // enregistrement retroactif (seance deja donnee) ne doit pas la notifier.
    if (upcoming) {
      this.sessionNotifier.notifyPlanned(session.id);
    }
    return session;
  }

  async update(studentId: string, sessionId: string, dto: UpdateSessionDto) {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, studentId },
    });
    if (!session) {
      throw new NotFoundException('Séance introuvable');
    }
    return this.prisma.session.update({
      where: { id: sessionId },
      data: dto,
      include: teacherSelect,
    });
  }

  // Seance encore modifiable : a venir (ou a replanifier) et pas commencee.
  private async loadChangeable(studentId: string, sessionId: string) {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, studentId },
      include: { attendanceLogs: { where: { checkinAt: { not: null } }, take: 1 } },
    });
    if (!session) throw new NotFoundException('Séance introuvable');
    if (!['planifiee', 'confirmee', 'reportee'].includes(session.status)) {
      throw new BadRequestException('Cette séance ne peut plus être décalée ni annulée');
    }
    if (session.attendanceLogs.length > 0) {
      throw new BadRequestException('La séance a déjà commencé (arrivée pointée)');
    }
    return session;
  }

  async reschedule(studentId: string, sessionId: string, dto: RescheduleSessionDto, adminName: string) {
    const session = await this.loadChangeable(studentId, sessionId);
    const date = new Date(dto.date);
    if (date <= new Date()) {
      throw new BadRequestException('Le nouveau créneau doit être dans le futur');
    }
    const reason = dto.reason?.trim();
    if (session.status !== 'reportee' && !reason) {
      throw new BadRequestException('Indiquez le motif du déplacement (il sera envoyé à la famille et à l’enseignant)');
    }
    const durationMinutes = dto.durationMinutes ?? session.durationMinutes;
    if (session.teacherId) {
      await assertNoTeacherConflict(this.prisma, session.teacherId, date, durationMinutes, session.id);
      if (session.subject) {
        await this.availability.assertSlotsOk(
          studentId,
          session.teacherId,
          session.subject,
          [slotOf(date)],
          dto.confirmOutOfAvailability ?? false,
        );
      }
    }

    const updated = await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        date,
        durationMinutes,
        // La date d'origine est conservee : le programme ne recree pas la
        // seance a l'ancien creneau.
        rescheduledFrom: session.rescheduledFrom ?? session.date,
        status: session.status === 'reportee' ? 'planifiee' : session.status,
        changedBy: 'admin',
        changedAt: new Date(),
        // Nouveau creneau : les rappels repartent de zero.
        checkinReminderSentAt: null,
        checkoutReminderSentAt: null,
        emailReminderSentAt: null,
      },
      include: teacherSelect,
    });
    this.sessionChanges
      .notifyAdminChange(
        'rescheduled',
        sessionId,
        adminName,
        reason || 'Nouveau créneau suite à la demande de décalage',
        session.date,
      )
      .catch((error) => this.logger.error(`Notification de déplacement ${sessionId} échouée`, error));
    return updated;
  }

  async cancel(studentId: string, sessionId: string, dto: CancelSessionDto, adminName: string) {
    await this.loadChangeable(studentId, sessionId);
    const reason = dto.reason.trim();
    const updated = await this.prisma.session.update({
      where: { id: sessionId },
      data: { status: 'annulee', cancellationReason: reason, changedBy: 'admin', changedAt: new Date() },
      include: teacherSelect,
    });
    this.sessionChanges
      .notifyAdminChange('cancelled', sessionId, adminName, reason)
      .catch((error) => this.logger.error(`Notification d'annulation ${sessionId} échouée`, error));
    return updated;
  }

  // Programme hebdomadaire pose par l'admin : memes regles que cote
  // enseignant (creneaux, conflits, disponibilites, generation des seances
  // jusqu'a la fin de l'accompagnement). La famille recoit le planning mis a
  // jour, l'enseignant est prevenu en plus.
  async upsertSchedule(studentId: string, dto: AdminUpsertScheduleDto) {
    const assignment = await this.prisma.studentTeacher.findFirst({
      where: { studentId, teacherId: dto.teacherId, subject: dto.subject },
      include: {
        teacher: { select: { name: true, gender: true, email: true, account: { select: { email: true } } } },
        student: { select: { name: true } },
      },
    });
    if (!assignment) {
      throw new BadRequestException(
        "Cet enseignant n'est pas affecté à cette matière pour cet élève : affectez-le d'abord (onglet Enseignants).",
      );
    }
    const { teacherId, startsOn, ...scheduleDto } = dto;
    const schedule = await this.recurringSchedule.upsert(
      { teacherId } as AuthenticatedTeacherAccount,
      studentId,
      scheduleDto,
      { startsOn: startsOn ? new Date(startsOn) : undefined },
    );

    const teacherEmail = assignment.teacher.account?.email ?? assignment.teacher.email;
    if (teacherEmail) {
      const slots = [...dto.slots]
        .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
        .map((s) => `${DAY_LABELS[s.dayOfWeek]} à ${s.time}`)
        .join(', ');
      const until = assignment.endsAt
        ? ` jusqu'au ${assignment.endsAt.toLocaleDateString('fr-FR')}`
        : '';
      this.emailService
        .send({
          to: teacherEmail,
          subject: `Nafoore Education — Programme mis en place : ${dto.subject} avec ${assignment.student.name}`,
          html: renderNoticeEmail({
            fullName: assignment.teacher.name,
            gender: assignment.teacher.gender,
            label: 'Programme mis en place',
            paragraphs: [
              `L'équipe Nafoore a mis en place le programme de ${dto.subject} avec ${assignment.student.name} : ${slots}, ${dto.durationMinutes ?? 60} minutes par séance${until}.`,
              `${schedule.sessionsCreated} séance${schedule.sessionsCreated > 1 ? 's ont été ajoutées' : ' a été ajoutée'} à votre planning.`,
            ],
            ctaUrl: `${resolvePortalUrl('teacher')}/planning`,
            ctaLabel: 'Voir le planning →',
          }),
        })
        .catch((error) => this.logger.error(`Email de programme à ${teacherEmail} échoué`, error));
    }
    return schedule;
  }
}
