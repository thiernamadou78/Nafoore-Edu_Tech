import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { AdminNotificationService } from '../email/admin-notification.service';
import { resolvePortalUrl } from '../email/portal-url.util';
import { renderNoticeEmail } from '../email/templates/notice.template';
import { AuthenticatedPortalAccount } from '../auth/portal-auth.guard';
import { AuthenticatedTeacherAccount } from '../auth/teacher-auth.guard';

// Le renouvellement n'est propose que dans les jours qui precedent la fin de
// la periode (ou apres), pas des le premier jour.
const RENEWAL_WINDOW_DAYS = 14;
const OPEN_STATUSES = ['en_attente_prof', 'acceptee_prof'];

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

const assignmentInclude = {
  student: {
    select: {
      id: true,
      name: true,
      parentLeadId: true,
      parentLead: {
        select: {
          name: true,
          gender: true,
          portalAccount: { select: { email: true, fullName: true } },
        },
      },
    },
  },
  teacher: {
    select: { id: true, name: true, gender: true, account: { select: { email: true } } },
  },
};

@Injectable()
export class RenewalsService {
  private readonly logger = new Logger(RenewalsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly adminNotification: AdminNotificationService,
  ) {}

  // ---------------------------------------------------------------- famille

  async requestRenewal(
    portalAccount: AuthenticatedPortalAccount,
    studentTeacherId: string,
    periodMonths: number,
  ) {
    const assignment = await this.prisma.studentTeacher.findUnique({
      where: { id: studentTeacherId },
      include: assignmentInclude,
    });
    // 404 (pas 403) si l'accompagnement n'appartient pas a cette famille.
    if (!assignment || assignment.student.parentLeadId !== portalAccount.leadId) {
      throw new NotFoundException('Accompagnement introuvable');
    }
    if (!assignment.endsAt) {
      throw new ConflictException("Cet accompagnement n'a pas de période définie");
    }
    const daysLeft = (assignment.endsAt.getTime() - Date.now()) / 86_400_000;
    if (daysLeft > RENEWAL_WINDOW_DAYS) {
      throw new ConflictException(
        `Le renouvellement sera possible dans les ${RENEWAL_WINDOW_DAYS} jours précédant la fin de la période`,
      );
    }
    const open = await this.prisma.periodRenewal.findFirst({
      where: { studentTeacherId, status: { in: OPEN_STATUSES } },
    });
    if (open) {
      throw new ConflictException('Une demande de renouvellement est déjà en cours');
    }

    const renewal = await this.prisma.periodRenewal.create({
      data: { studentTeacherId, periodMonths },
    });

    const subject = assignment.subject ?? 'soutien scolaire';
    const studentName = assignment.student.name;

    this.adminNotification.notify({
      subject: `Demande de renouvellement : ${studentName}`,
      title: 'Demande de renouvellement',
      lines: [
        `Famille : ${portalAccount.fullName}`,
        `Élève : ${studentName}`,
        `Enseignant : ${assignment.teacher.name}`,
        `Matière : ${subject}`,
        `Durée demandée : ${periodMonths} mois`,
      ],
      path: '/renouvellements',
    });

    if (assignment.teacher.account?.email) {
      this.sendNotice({
        to: assignment.teacher.account.email,
        subject: `Nafoore Education — Demande de renouvellement pour ${studentName}`,
        fullName: assignment.teacher.name,
        gender: assignment.teacher.gender,
        label: 'Renouvellement',
        paragraphs: [
          `La famille de ${studentName} souhaite renouveler l'accompagnement en ${subject} pour ${periodMonths} mois.`,
          "Vous pouvez répondre depuis l'onglet Demandes > Renouvellements : accepter ou décliner. L'équipe Nafoore confirmera ensuite le renouvellement.",
        ],
        ctaUrl: resolvePortalUrl('teacher'),
      });
    }

    return renewal;
  }

  // ------------------------------------------------------------------ prof

  async listForTeacher(teacherAccount: AuthenticatedTeacherAccount) {
    if (!teacherAccount.teacherId) return [];
    const renewals = await this.prisma.periodRenewal.findMany({
      where: { studentTeacher: { teacherId: teacherAccount.teacherId } },
      orderBy: { createdAt: 'desc' },
      include: { studentTeacher: { include: { student: { select: { name: true } } } } },
    });
    return renewals.map(({ studentTeacher, ...renewal }) => ({
      ...renewal,
      studentName: studentTeacher.student.name,
      subject: studentTeacher.subject,
      endsAt: studentTeacher.endsAt,
    }));
  }

  async respondAsTeacher(
    teacherAccount: AuthenticatedTeacherAccount,
    renewalId: string,
    accept: boolean,
    comment?: string,
  ) {
    const renewal = await this.prisma.periodRenewal.findUnique({
      where: { id: renewalId },
      include: { studentTeacher: { include: assignmentInclude } },
    });
    if (
      !renewal ||
      !teacherAccount.teacherId ||
      renewal.studentTeacher.teacherId !== teacherAccount.teacherId
    ) {
      throw new NotFoundException('Renouvellement introuvable');
    }
    if (renewal.status !== 'en_attente_prof') {
      throw new ConflictException("Ce renouvellement n'attend plus ta réponse");
    }

    const { studentTeacher } = renewal;
    const studentName = studentTeacher.student.name;
    const subject = studentTeacher.subject ?? 'soutien scolaire';
    const trimmedComment = comment?.trim() || null;

    if (accept) {
      await this.prisma.periodRenewal.update({
        where: { id: renewalId },
        data: {
          status: 'acceptee_prof',
          teacherComment: trimmedComment,
          teacherRespondedAt: new Date(),
        },
      });
      this.adminNotification.notify({
        subject: `Renouvellement accepté par le prof : ${studentName}`,
        title: 'Renouvellement accepté par l\'enseignant — à confirmer',
        lines: [
          `Enseignant : ${studentTeacher.teacher.name}`,
          `Élève : ${studentName}`,
          `Matière : ${subject}`,
          `Durée : ${renewal.periodMonths} mois`,
          ...(trimmedComment ? [`Commentaire : ${trimmedComment}`] : []),
        ],
        path: '/renouvellements',
      });
      return { status: 'acceptee_prof' };
    }

    // Refus du prof : la famille ne reste pas sans solution, une nouvelle
    // demande de professeur est ouverte automatiquement pour la meme matiere.
    const previous = await this.prisma.teacherRequest.findFirst({
      where: { studentId: studentTeacher.studentId, subject },
      orderBy: { createdAt: 'desc' },
    });
    const newRequest = await this.prisma.$transaction(async (tx) => {
      const created = await tx.teacherRequest.create({
        data: {
          studentId: studentTeacher.studentId,
          subject,
          frequency: previous?.frequency ?? '1 séance par semaine',
          format: previous?.format ?? 'presentiel',
          availability: previous?.availability,
          durationMinutes: previous?.durationMinutes,
          periodMonths: renewal.periodMonths,
        },
      });
      await tx.periodRenewal.update({
        where: { id: renewalId },
        data: {
          status: 'refusee_prof',
          teacherComment: trimmedComment,
          teacherRespondedAt: new Date(),
          newRequestId: created.id,
        },
      });
      return created;
    });

    this.adminNotification.notify({
      subject: `Renouvellement décliné par le prof : ${studentName}`,
      title: 'Renouvellement décliné — nouvelle demande de prof ouverte',
      lines: [
        `Enseignant : ${studentTeacher.teacher.name}`,
        `Élève : ${studentName}`,
        `Matière : ${subject}`,
        ...(trimmedComment ? [`Commentaire : ${trimmedComment}`] : []),
        'Une nouvelle demande de professeur a été créée automatiquement pour la famille.',
      ],
      path: `/demandes-professeur/${newRequest.id}`,
    });

    const family = studentTeacher.student.parentLead?.portalAccount;
    if (family?.email) {
      this.sendNotice({
        to: family.email,
        subject: `Nafoore Education — Nous cherchons un nouveau professeur pour ${studentName}`,
        fullName: family.fullName,
        gender: studentTeacher.student.parentLead?.gender,
        label: 'Renouvellement',
        paragraphs: [
          `Votre professeur actuel ne pourra malheureusement pas poursuivre l'accompagnement de ${studentName} en ${subject}.`,
          "Pas d'inquiétude : nous avons ouvert automatiquement une nouvelle demande de professeur pour la même matière et nous vous proposerons rapidement un nouveau profil.",
        ],
        ctaUrl: `${resolvePortalUrl('famille')}/eleves/${studentTeacher.studentId}`,
      });
    }

    return { status: 'refusee_prof', newRequestId: newRequest.id };
  }

  // ----------------------------------------------------------------- admin

  async listForAdmin() {
    const renewals = await this.prisma.periodRenewal.findMany({
      orderBy: { createdAt: 'desc' },
      include: { studentTeacher: { include: assignmentInclude } },
    });
    return renewals.map(({ studentTeacher, ...renewal }) => ({
      ...renewal,
      subject: studentTeacher.subject,
      endsAt: studentTeacher.endsAt,
      student: { id: studentTeacher.student.id, name: studentTeacher.student.name },
      familyName:
        studentTeacher.student.parentLead?.portalAccount?.fullName ??
        studentTeacher.student.parentLead?.name ??
        null,
      teacher: { id: studentTeacher.teacher.id, name: studentTeacher.teacher.name },
    }));
  }

  async confirm(adminId: string, renewalId: string) {
    const renewal = await this.loadForAdmin(renewalId);
    if (renewal.status !== 'acceptee_prof') {
      throw new ConflictException(
        "Le renouvellement ne peut être confirmé qu'après l'accord de l'enseignant",
      );
    }
    const { studentTeacher } = renewal;
    const base =
      studentTeacher.endsAt && studentTeacher.endsAt > new Date()
        ? studentTeacher.endsAt
        : new Date();
    const newEnd = addMonths(base, renewal.periodMonths);

    await this.prisma.$transaction([
      this.prisma.studentTeacher.update({
        where: { id: studentTeacher.id },
        data: { endsAt: newEnd },
      }),
      this.prisma.periodRenewal.update({
        where: { id: renewalId },
        data: { status: 'confirmee', decidedAt: new Date(), decidedById: adminId },
      }),
    ]);

    const studentName = studentTeacher.student.name;
    const subject = studentTeacher.subject ?? 'soutien scolaire';
    const endLabel = newEnd.toLocaleDateString('fr-FR', { dateStyle: 'long' });
    const family = studentTeacher.student.parentLead?.portalAccount;
    if (family?.email) {
      this.sendNotice({
        to: family.email,
        subject: `Nafoore Education — Renouvellement confirmé pour ${studentName}`,
        fullName: family.fullName,
        gender: studentTeacher.student.parentLead?.gender,
        label: 'Renouvellement confirmé',
        paragraphs: [
          `Bonne nouvelle : l'accompagnement de ${studentName} en ${subject} est renouvelé pour ${renewal.periodMonths} mois, jusqu'au ${endLabel}.`,
        ],
        ctaUrl: `${resolvePortalUrl('famille')}/eleves/${studentTeacher.studentId}`,
      });
    }
    if (studentTeacher.teacher.account?.email) {
      this.sendNotice({
        to: studentTeacher.teacher.account.email,
        subject: `Nafoore Education — Renouvellement confirmé pour ${studentName}`,
        fullName: studentTeacher.teacher.name,
        gender: studentTeacher.teacher.gender,
        label: 'Renouvellement confirmé',
        paragraphs: [
          `Le renouvellement de ${studentName} en ${subject} est confirmé pour ${renewal.periodMonths} mois, jusqu'au ${endLabel}. Vous pouvez continuer à planifier vos séances.`,
        ],
        ctaUrl: resolvePortalUrl('teacher'),
      });
    }

    return { status: 'confirmee', endsAt: newEnd };
  }

  async reject(adminId: string, renewalId: string, reason: string) {
    const renewal = await this.loadForAdmin(renewalId);
    if (!OPEN_STATUSES.includes(renewal.status)) {
      throw new ConflictException("Ce renouvellement n'est plus en cours");
    }
    await this.prisma.periodRenewal.update({
      where: { id: renewalId },
      data: {
        status: 'refusee_admin',
        decidedAt: new Date(),
        decidedById: adminId,
        adminReason: reason.trim(),
      },
    });

    const { studentTeacher } = renewal;
    const family = studentTeacher.student.parentLead?.portalAccount;
    if (family?.email) {
      this.sendNotice({
        to: family.email,
        subject: `Nafoore Education — Renouvellement de ${studentTeacher.student.name}`,
        fullName: family.fullName,
        gender: studentTeacher.student.parentLead?.gender,
        label: 'Renouvellement',
        paragraphs: [
          `Nous ne pouvons pas donner suite à la demande de renouvellement de l'accompagnement de ${studentTeacher.student.name}.`,
          `Motif : ${reason.trim()}`,
          'Notre équipe reste à votre disposition pour trouver la meilleure solution.',
        ],
        ctaUrl: `${resolvePortalUrl('famille')}/eleves/${studentTeacher.studentId}`,
      });
    }
    return { status: 'refusee_admin' };
  }

  private async loadForAdmin(renewalId: string) {
    const renewal = await this.prisma.periodRenewal.findUnique({
      where: { id: renewalId },
      include: { studentTeacher: { include: assignmentInclude } },
    });
    if (!renewal) {
      throw new NotFoundException('Renouvellement introuvable');
    }
    return renewal;
  }

  private sendNotice(input: {
    to: string;
    subject: string;
    fullName: string;
    gender?: string | null;
    label: string;
    paragraphs: string[];
    ctaUrl?: string;
  }) {
    this.emailService
      .send({
        to: input.to,
        subject: input.subject,
        html: renderNoticeEmail({
          gender: input.gender,
          fullName: input.fullName,
          label: input.label,
          paragraphs: input.paragraphs,
          ctaUrl: input.ctaUrl,
        }),
      })
      .catch((error) =>
        this.logger.error(
          `Échec d'envoi de l'email "${input.subject}" à ${input.to}`,
          error instanceof Error ? error.stack : undefined,
        ),
      );
  }
}
