import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { matchLevel } from '../common/levels';
import { AuthenticatedAdmin } from '../auth/supabase-auth.guard';
import { ZoneService } from '../auth/zone.service';
import { EmailService } from '../email/email.service';
import { renderMatchingConfirmationEmail } from '../email/templates/matching-confirmation.template';
import { renderMatchingProposalEmail } from '../email/templates/matching-proposal.template';
import { renderTeacherProposedEmail } from '../email/templates/teacher-proposed.template';
import { renderMatchingResponseEmail } from '../email/templates/matching-response.template';
import { GeocodingService } from '../geocoding/geocoding.service';
import { AdminNotificationService } from '../email/admin-notification.service';
import { resolvePortalUrl } from '../email/portal-url.util';
import { StudentsService } from '../students/students.service';
import { AuthenticatedPortalAccount } from '../auth/portal-auth.guard';
import { AuthenticatedTeacherAccount } from '../auth/teacher-auth.guard';
import { CreateTeacherRequestDto } from './dto/create-teacher-request.dto';
import { UpdateTeacherRequestDto } from './dto/update-teacher-request.dto';
import { AssignTeacherDto } from './dto/assign-teacher.dto';
import { renderNoticeEmail } from '../email/templates/notice.template';
import { ProposeMatchingDto } from './dto/propose-matching.dto';
import { RefuseMatchingDto } from './dto/refuse-matching.dto';
import { ListTeacherRequestsQueryDto } from './dto/list-teacher-requests-query.dto';

const adminMatchingSelect = {
  id: true,
  status: true,
  createdAt: true,
  respondedAt: true,
  refusalReason: true,
  hourlyRate: true,
  teacher: { select: { id: true, name: true } },
  proposedBy: { select: { id: true, name: true } },
};

const teacherContactSelect = {
  id: true,
  name: true,
  gender: true,
  account: { select: { email: true } },
};

const ASSIGNED_BY_TEAM_REASON = "Un enseignant a été assigné par l'équipe Nafoore";
const REQUEST_CANCELLED_REASON = 'La famille a annulé sa demande';
const OTHER_TEACHER_CHOSEN_REASON = 'Un autre enseignant a été choisi par la famille';

const adminInterestSelect = {
  id: true,
  createdAt: true,
  interested: true,
  teacher: { select: { id: true, name: true } },
};

@Injectable()
export class TeacherRequestsService {
  private readonly logger = new Logger(TeacherRequestsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly zone: ZoneService,
    private readonly studentsService: StudentsService,
    private readonly emailService: EmailService,
    private readonly geocoding: GeocodingService,
    private readonly adminNotification: AdminNotificationService,
  ) {}

  async createRequest(
    portalAccount: AuthenticatedPortalAccount,
    studentId: string,
    dto: CreateTeacherRequestDto,
  ) {
    const ownedStudent = await this.assertOwnedStudent(portalAccount, studentId);

    const created = await this.prisma.teacherRequest.create({
      data: {
        studentId,
        subject: dto.subject,
        frequency: dto.frequency,
        format: dto.format,
        availability: dto.availability,
        durationMinutes: dto.durationMinutes,
        periodMonths: dto.periodMonths,
        desiredStartDate: dto.desiredStartDate ? new Date(dto.desiredStartDate) : null,
      },
    });

    this.adminNotification.notify({
      subject: `Nouvelle demande de prof : ${dto.subject}`,
      title: 'Nouvelle demande de professeur',
      lines: [
        `Famille : ${portalAccount.fullName}`,
        `Élève : ${ownedStudent.name}`,
        `Matière : ${dto.subject}`,
        `Format : ${dto.format}`,
        `Fréquence : ${dto.frequency}`,
        `Durée souhaitée : ${dto.periodMonths} mois`,
      ],
      path: `/demandes-professeur/${created.id}`,
    });

    return created;
  }

  // Assignation directe : l'admin choisit le prof, le tarif et la periode ; la
  // famille n'a rien a confirmer, elle recoit seulement un email.
  async assignTeacher(adminId: string, dto: AssignTeacherDto) {
    const [student, teacher] = await Promise.all([
      this.prisma.student.findUnique({
        where: { id: dto.studentId },
        select: {
          id: true,
          name: true,
          parentLead: {
            select: {
              name: true,
              gender: true,
              email: true,
              portalAccount: { select: { email: true, fullName: true } },
            },
          },
        },
      }),
      this.prisma.teacher.findUnique({
        where: { id: dto.teacherId },
        select: { id: true, name: true, gender: true, subjects: true, account: { select: { email: true } } },
      }),
    ]);
    if (!student) throw new NotFoundException('Élève introuvable');
    if (!teacher) throw new NotFoundException('Enseignant introuvable');
    if (!teacher.subjects.includes(dto.subject)) {
      throw new BadRequestException(`${teacher.name} ne donne pas de cours de ${dto.subject}`);
    }
    const existing = await this.prisma.studentTeacher.findFirst({
      where: { studentId: dto.studentId, teacherId: dto.teacherId, subject: dto.subject },
    });
    if (existing) {
      throw new ConflictException('Ce professeur est déjà assigné à cet élève pour cette matière');
    }

    const endsAt = new Date();
    endsAt.setMonth(endsAt.getMonth() + dto.periodMonths);

    // Une demande de la famille sur la meme matiere est reglee par cette
    // assignation : les propositions encore en attente sont clotures.
    const pending = await this.prisma.matching.findMany({
      where: {
        status: 'proposee',
        teacherRequest: {
          studentId: dto.studentId,
          subject: dto.subject,
          status: { in: ['en_attente', 'proposition_envoyee'] },
        },
      },
      include: { teacher: { select: teacherContactSelect } },
    });

    await this.prisma.$transaction(async (tx) => {
      await this.studentsService.addTeacherAssignment(
        dto.studentId,
        dto.teacherId,
        adminId,
        dto.subject,
        tx,
        endsAt,
        dto.hourlyRate,
      );
      await tx.matching.updateMany({
        where: { id: { in: pending.map((m) => m.id) } },
        data: { status: 'refusee', refusalReason: ASSIGNED_BY_TEAM_REASON, respondedAt: new Date() },
      });
      await tx.teacherRequest.updateMany({
        where: {
          studentId: dto.studentId,
          subject: dto.subject,
          status: { in: ['en_attente', 'proposition_envoyee'] },
        },
        data: { status: 'acceptee' },
      });
    });

    const endLabel = endsAt.toLocaleDateString('fr-FR', { dateStyle: 'long' });
    const lead = student.parentLead;
    const familyEmail = lead?.portalAccount?.email ?? lead?.email;
    if (familyEmail && lead) {
      this.emailService
        .send({
          to: familyEmail,
          subject: `Nafoore Education — ${student.name} est assigné(e) à un enseignant`,
          html: renderNoticeEmail({
            gender: lead.gender,
            fullName: lead.portalAccount?.fullName ?? lead.name,
            label: 'Enseignant assigné',
            paragraphs: [
              `Bonne nouvelle : ${teacher.name} est assigné(e) à ${student.name} pour les cours de ${dto.subject}, pendant ${dto.periodMonths} mois (jusqu'au ${endLabel}).`,
              "Aucune action n'est nécessaire de votre part : les séances seront planifiées par l'enseignant et vous serez prévenu(e) à chaque fois.",
            ],
            ctaUrl: `${resolvePortalUrl('famille')}/eleves/${student.id}`,
            ctaLabel: "Voir la fiche de l'élève →",
          }),
        })
        .catch((error) =>
          this.logger.error(
            `Échec d'envoi de l'email d'assignation à la famille (${student.name})`,
            error instanceof Error ? error.stack : undefined,
          ),
        );
    }
    if (teacher.account?.email) {
      this.emailService
        .send({
          to: teacher.account.email,
          subject: `Nafoore Education — Vous êtes assigné(e) à ${student.name}`,
          html: renderNoticeEmail({
            gender: teacher.gender,
            fullName: teacher.name,
            label: 'Nouvel élève',
            paragraphs: [
              `Vous êtes assigné(e) à ${student.name} pour des cours de ${dto.subject}, pendant ${dto.periodMonths} mois (jusqu'au ${endLabel}).`,
              `Le cours est fixé à ${dto.hourlyRate} €/h net.`,
              "Vous pouvez dès maintenant planifier la première séance depuis votre espace.",
            ],
            ctaUrl: resolvePortalUrl('teacher'),
          }),
        })
        .catch((error) =>
          this.logger.error(
            `Échec d'envoi de l'email d'assignation au prof (${teacher.name})`,
            error instanceof Error ? error.stack : undefined,
          ),
        );
    }
    for (const matching of pending) {
      this.notifyTeacher(matching.teacher, student.name, dto.subject, 'cloturee', ASSIGNED_BY_TEAM_REASON);
    }

    return { studentId: dto.studentId, teacherId: dto.teacherId, subject: dto.subject, endsAt };
  }

  async updateRequest(
    portalAccount: AuthenticatedPortalAccount,
    requestId: string,
    dto: UpdateTeacherRequestDto,
  ) {
    const request = await this.loadOwnedRequest(portalAccount, requestId);
    if (request.status === 'proposition_envoyee') {
      throw new ConflictException(
        'Une proposition est en cours : réponds-y ou annule la demande avant de la modifier',
      );
    }
    if (request.status !== 'en_attente') {
      throw new ConflictException("Cette demande n'est plus modifiable");
    }

    return this.prisma.teacherRequest.update({
      where: { id: requestId },
      data: {
        frequency: dto.frequency,
        format: dto.format,
        availability: dto.availability,
        durationMinutes: dto.durationMinutes,
        periodMonths: dto.periodMonths,
        desiredStartDate: dto.desiredStartDate ? new Date(dto.desiredStartDate) : undefined,
      },
    });
  }

  async cancelRequest(portalAccount: AuthenticatedPortalAccount, requestId: string) {
    const request = await this.loadOwnedRequest(portalAccount, requestId);
    if (request.status !== 'en_attente' && request.status !== 'proposition_envoyee') {
      throw new ConflictException("Cette demande n'est plus annulable");
    }

    const pending = await this.prisma.matching.findMany({
      where: { teacherRequestId: requestId, status: 'proposee' },
      include: { teacher: { select: teacherContactSelect } },
    });

    await this.prisma.$transaction([
      this.prisma.matching.updateMany({
        where: { teacherRequestId: requestId, status: 'proposee' },
        data: { status: 'refusee', refusalReason: REQUEST_CANCELLED_REASON, respondedAt: new Date() },
      }),
      this.prisma.teacherRequest.update({ where: { id: requestId }, data: { status: 'annulee' } }),
    ]);

    this.adminNotification.notify({
      subject: `Demande de prof annulée : ${request.subject}`,
      title: 'Demande de professeur annulée par la famille',
      lines: [
        `Famille : ${portalAccount.fullName}`,
        `Élève : ${request.student.name}`,
        `Matière : ${request.subject}`,
        `Propositions en cours refusées : ${pending.length}`,
      ],
      path: `/demandes-professeur/${requestId}`,
    });

    for (const matching of pending) {
      this.notifyTeacher(
        matching.teacher,
        request.student.name,
        request.subject,
        'annulee',
        REQUEST_CANCELLED_REASON,
      );
    }

    return { status: 'annulee' };
  }

  async acceptMatching(portalAccount: AuthenticatedPortalAccount, matchingId: string) {
    const matching = await this.loadOwnedMatching(portalAccount, matchingId);

    if (matching.status !== 'proposee') {
      throw new ConflictException('Cette proposition n\'est plus en attente');
    }

    const otherPending = await this.prisma.matching.findMany({
      where: {
        teacherRequestId: matching.teacherRequestId,
        status: 'proposee',
        id: { not: matchingId },
      },
      include: { teacher: { select: teacherContactSelect } },
    });

    const requestPeriod = await this.prisma.teacherRequest.findUnique({
      where: { id: matching.teacherRequestId },
      select: { periodMonths: true },
    });
    let periodEnd: Date | null = null;
    if (requestPeriod?.periodMonths) {
      periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + requestPeriod.periodMonths);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.matching.update({
        where: { id: matchingId },
        data: { status: 'acceptee', respondedAt: new Date() },
      });
      await tx.teacherRequest.update({
        where: { id: matching.teacherRequestId },
        data: { status: 'acceptee' },
      });
      // La demande est résolue : les autres propositions encore en attente
      // pour cette même demande n'ont plus lieu d'être.
      await tx.matching.updateMany({
        where: {
          teacherRequestId: matching.teacherRequestId,
          status: 'proposee',
          id: { not: matchingId },
        },
        data: {
          status: 'refusee',
          refusalReason: OTHER_TEACHER_CHOSEN_REASON,
          respondedAt: new Date(),
        },
      });
      await this.studentsService.addTeacherAssignment(
        matching.teacherRequest.studentId,
        matching.teacherId,
        matching.proposedById,
        matching.teacherRequest.subject,
        tx,
        periodEnd,
        matching.hourlyRate,
      );
    });

    const leadGender = await this.prisma.lead.findUnique({
      where: { id: portalAccount.leadId },
      select: { gender: true },
    });

    // Email best-effort en arrière-plan : la famille ne doit pas attendre la
    // réponse du fournisseur d'email pour voir son statut changer.
    this.emailService
      .send({
        to: portalAccount.email,
        subject: `Nafoore Education — Professeur confirmé pour ${matching.teacherRequest.student.name}`,
        html: renderMatchingConfirmationEmail({
          gender: leadGender?.gender,
          fullName: portalAccount.fullName,
          studentName: matching.teacherRequest.student.name,
          teacherName: matching.teacher.name,
          subject: matching.teacherRequest.subject,
          portalUrl: resolvePortalUrl('famille'),
        }),
      })
      .then((result) => {
        this.logger.log(
          `Email de confirmation de matching envoyé (${result.providerId ?? 'n/a'})`,
        );
      })
      .catch((sendError) => {
        this.logger.error(
          `Échec d'envoi de l'email de confirmation de matching (matching ${matchingId})`,
          sendError instanceof Error ? sendError.stack : undefined,
        );
      });

    const { student, subject } = matching.teacherRequest;
    this.adminNotification.notify({
      subject: `Prof accepté par la famille : ${matching.teacher.name}`,
      title: 'Proposition acceptée par la famille',
      lines: [
        `Enseignant : ${matching.teacher.name}`,
        `Élève : ${student.name}`,
        `Matière : ${subject}`,
        `Famille : ${portalAccount.fullName}`,
      ],
      path: `/demandes-professeur/${matching.teacherRequestId}`,
    });
    this.notifyTeacher(matching.teacher, student.name, subject, 'acceptee', null);
    for (const other of otherPending) {
      this.notifyTeacher(other.teacher, student.name, subject, 'refusee', OTHER_TEACHER_CHOSEN_REASON);
    }

    return { status: 'acceptee' };
  }

  // Email best-effort au prof concerne (acceptation ou refus avec motif) :
  // il ne doit pas decouvrir la reponse de la famille par hasard.
  private notifyTeacher(
    teacher: { name: string; gender: string | null; account: { email: string } | null },
    studentName: string,
    subject: string,
    outcome: 'acceptee' | 'refusee' | 'annulee' | 'cloturee',
    reason: string | null,
  ) {
    if (!teacher.account?.email) return;
    this.emailService
      .send({
        to: teacher.account.email,
        subject:
          outcome === 'acceptee'
            ? `Nafoore Education — Votre proposition a été acceptée (${subject})`
            : outcome === 'annulee'
              ? `Nafoore Education — Demande annulée par la famille (${subject})`
              : outcome === 'cloturee'
                ? `Nafoore Education — Demande clôturée (${subject})`
                : `Nafoore Education — Votre proposition n'a pas été retenue (${subject})`,
        html: renderMatchingResponseEmail({
          gender: teacher.gender,
          teacherName: teacher.name,
          studentName,
          subject,
          outcome,
          reason,
          portalUrl: resolvePortalUrl('teacher'),
        }),
      })
      .catch((error) =>
        this.logger.error(
          `Échec d'envoi de l'email de réponse de proposition au prof ${teacher.name}`,
          error instanceof Error ? error.stack : undefined,
        ),
      );
  }

  async refuseMatching(
    portalAccount: AuthenticatedPortalAccount,
    matchingId: string,
    dto: RefuseMatchingDto,
  ) {
    const matching = await this.loadOwnedMatching(portalAccount, matchingId);

    if (matching.status !== 'proposee') {
      throw new ConflictException('Cette proposition n\'est plus en attente');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.matching.update({
        where: { id: matchingId },
        data: {
          status: 'refusee',
          refusalReason: dto.refusalReason.trim(),
          respondedAt: new Date(),
        },
      });
      // D'autres propositions peuvent encore attendre la reponse de la famille.
      const stillPending = await tx.matching.count({
        where: { teacherRequestId: matching.teacherRequestId, status: 'proposee' },
      });
      await tx.teacherRequest.update({
        where: { id: matching.teacherRequestId },
        data: { status: stillPending > 0 ? 'proposition_envoyee' : 'en_attente' },
      });
    });

    this.adminNotification.notify({
      subject: `Prof refusé par la famille : ${matching.teacher.name}`,
      title: 'Proposition refusée par la famille',
      lines: [
        `Enseignant : ${matching.teacher.name}`,
        `Élève : ${matching.teacherRequest.student.name}`,
        `Matière : ${matching.teacherRequest.subject}`,
        `Motif : ${dto.refusalReason.trim()}`,
      ],
      path: `/demandes-professeur/${matching.teacherRequestId}`,
    });

    this.notifyTeacher(
      matching.teacher,
      matching.teacherRequest.student.name,
      matching.teacherRequest.subject,
      'refusee',
      dto.refusalReason.trim(),
    );

    return { status: 'refusee' };
  }

  async listForAdmin(query: ListTeacherRequestsQueryDto, admin: AuthenticatedAdmin) {
    const zoneWhere = await this.zone.where(admin, 'teacherRequest');
    return this.prisma.teacherRequest.findMany({
      where: { status: query.status, AND: zoneWhere ? [zoneWhere] : [] },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            level: true,
            classe: true,
            parentLead: {
              select: {
                id: true,
                name: true,
                email: true,
                portalAccount: { select: { familyName: true } },
              },
            },
          },
        },
        matchings: {
          orderBy: { createdAt: 'desc' },
          select: adminMatchingSelect,
        },
        interests: {
          orderBy: { createdAt: 'desc' },
          select: adminInterestSelect,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneForAdmin(id: string) {
    const request = await this.prisma.teacherRequest.findUnique({
      where: { id },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            level: true,
            classe: true,
            parentLead: {
              select: {
                id: true,
                name: true,
                email: true,
                portalAccount: { select: { familyName: true } },
              },
            },
          },
        },
        matchings: {
          orderBy: { createdAt: 'desc' },
          select: adminMatchingSelect,
        },
        interests: {
          orderBy: { createdAt: 'desc' },
          select: adminInterestSelect,
        },
      },
    });
    if (!request) {
      throw new NotFoundException('Demande introuvable');
    }
    return request;
  }

  async proposeMatching(adminId: string, requestId: string, dto: ProposeMatchingDto) {
    const request = await this.prisma.teacherRequest.findUnique({
      where: { id: requestId },
      include: {
        student: {
          select: {
            name: true,
            parentLead: {
              select: {
                gender: true,
                portalAccount: { select: { email: true, fullName: true } },
              },
            },
          },
        },
      },
    });
    if (!request) {
      throw new NotFoundException('Demande introuvable');
    }
    if (request.status === 'acceptee' || request.status === 'annulee') {
      throw new ConflictException('Cette demande est déjà clôturée');
    }

    // Plusieurs profs peuvent être proposés pour une même demande, mais
    // jamais le même deux fois (même s'il avait déjà été refusé).
    const alreadyProposed = await this.prisma.matching.findFirst({
      where: { teacherRequestId: requestId, teacherId: dto.teacherId },
    });
    if (alreadyProposed) {
      throw new ConflictException('Ce professeur a déjà été proposé pour cette demande');
    }

    const teacher = await this.prisma.teacher.findUnique({
      where: { id: dto.teacherId },
      select: {
        id: true,
        name: true,
        gender: true,
        subjects: true,
        bio: true,
        postalCode: true,
        city: true,
        verified: true,
        account: { select: { email: true } },
      },
    });
    if (!teacher) {
      throw new NotFoundException('Enseignant introuvable');
    }

    const [matching] = await this.prisma.$transaction([
      this.prisma.matching.create({
        data: {
          teacherRequestId: requestId,
          teacherId: dto.teacherId,
          proposedById: adminId,
          hourlyRate: dto.hourlyRate,
        },
      }),
      this.prisma.teacherRequest.update({
        where: { id: requestId },
        data: { status: 'proposition_envoyee' },
      }),
    ]);

    const portalAccount = request.student.parentLead?.portalAccount;
    if (portalAccount) {
      // Email best-effort en arrière-plan : ne bloque pas la réponse à l'admin.
      this.emailService
        .send({
          to: portalAccount.email,
          subject: `Nafoore Education — Un professeur a été proposé pour ${request.student.name}`,
          html: renderMatchingProposalEmail({
            gender: request.student.parentLead?.gender,
            fullName: portalAccount.fullName,
            studentName: request.student.name,
            subject: request.subject,
            teacherName: teacher.name,
            teacherSubjects: teacher.subjects,
            teacherBio: teacher.bio,
            teacherAddress: await this.geocoding.locationLabel(teacher.postalCode, teacher.city),
            teacherVerified: teacher.verified,
            portalUrl: `${resolvePortalUrl('famille')}/eleves/${request.studentId}`,
          }),
        })
        .then((result) => {
          this.logger.log(
            `Email de proposition de matching envoyé (${result.providerId ?? 'n/a'})`,
          );
        })
        .catch((sendError) => {
          this.logger.error(
            `Échec d'envoi de l'email de proposition de matching (demande ${requestId})`,
            sendError instanceof Error ? sendError.stack : undefined,
          );
        });
    }

    if (teacher.account?.email) {
      // Le prof doit savoir qu'il a été proposé, pas seulement la famille —
      // sinon il découvre son propre matching seulement si la famille le
      // contacte, ou jamais s'il n'a pas encore de compte actif surveillé.
      this.emailService
        .send({
          to: teacher.account.email,
          subject: `Nafoore Education — Vous avez été proposé pour ${request.student.name}`,
          html: renderTeacherProposedEmail({
            gender: teacher.gender,
            hourlyRate: dto.hourlyRate,
            teacherName: teacher.name,
            studentName: request.student.name,
            subject: request.subject,
            portalUrl: resolvePortalUrl('teacher'),
          }),
        })
        .catch((sendError) => {
          this.logger.error(
            `Échec d'envoi de l'email de proposition au prof (demande ${requestId})`,
            sendError instanceof Error ? sendError.stack : undefined,
          );
        });
    }

    return matching;
  }

  // "Demandes qui me concernent" côté prof : ouvertes, sur une matière qu'il
  // enseigne, et pas déjà proposées à lui (il verrait alors une demande où
  // il est déjà dans le circuit de décision, redondant avec Mes élèves).
  async listOpenForTeacher(teacherAccount: AuthenticatedTeacherAccount) {
    if (!teacherAccount.teacherId) return [];
    const teacherId = teacherAccount.teacherId;

    const teacher = await this.prisma.teacher.findUnique({
      where: { id: teacherId },
      select: { subjects: true, levels: true, classes: true },
    });
    if (!teacher || teacher.subjects.length === 0) return [];

    const requests = await this.prisma.teacherRequest.findMany({
      where: {
        status: { in: ['en_attente', 'proposition_envoyee'] },
        subject: { in: teacher.subjects },
        matchings: { none: { teacherId } },
      },
      select: {
        id: true,
        createdAt: true,
        subject: true,
        format: true,
        frequency: true,
        durationMinutes: true,
        periodMonths: true,
        availability: true,
        desiredStartDate: true,
        // Volontairement ni adresse complete ni nom de l'eleve : seulement
        // classe, code postal et ville.
        student: { select: { level: true, classe: true, school: true, postalCode: true, city: true } },
        interests: { where: { teacherId }, select: { interested: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Meme matiere ne suffit pas : Maths en 5e ne concerne pas un prof qui
    // n'enseigne qu'en 6e (voir matchLevel).
    const compatible = requests.filter(
      (request) => matchLevel(teacher, request.student) === 'match',
    );

    return Promise.all(
      compatible.map(async ({ interests, student, ...request }) => ({
        ...request,
        level: student.level,
        classe: student.classe,
        school: student.school,
        postalCode: student.postalCode,
        city: student.city ?? (await this.geocoding.cityForPostalCode(student.postalCode)),
        reaction: interests.length === 0 ? null : interests[0].interested ? 'interested' : 'declined',
      })),
    );
  }

  async reactToRequest(
    teacherAccount: AuthenticatedTeacherAccount,
    requestId: string,
    interested: boolean,
  ) {
    if (!teacherAccount.teacherId) {
      throw new NotFoundException('Profil enseignant introuvable');
    }
    const request = await this.prisma.teacherRequest.findUnique({ where: { id: requestId } });
    if (!request) {
      throw new NotFoundException('Demande introuvable');
    }

    await this.prisma.teacherRequestInterest.upsert({
      where: {
        teacherRequestId_teacherId: { teacherRequestId: requestId, teacherId: teacherAccount.teacherId },
      },
      create: { teacherRequestId: requestId, teacherId: teacherAccount.teacherId, interested },
      update: { interested },
    });
    return { reaction: interested ? 'interested' : 'declined' };
  }

  // "Mes propositions" cote prof : historique de toutes les fois ou l'equipe
  // l'a propose (en attente de la famille, acceptee, ou refusee avec motif).
  async listProposalsForTeacher(teacherAccount: AuthenticatedTeacherAccount) {
    if (!teacherAccount.teacherId) return [];
    const matchings = await this.prisma.matching.findMany({
      where: { teacherId: teacherAccount.teacherId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        createdAt: true,
        respondedAt: true,
        refusalReason: true,
        hourlyRate: true,
        teacherRequest: {
          select: {
            subject: true,
            format: true,
            student: { select: { level: true, classe: true, postalCode: true } },
          },
        },
      },
    });
    return matchings.map(({ teacherRequest, ...matching }) => ({
      ...matching,
      subject: teacherRequest.subject,
      format: teacherRequest.format,
      level: teacherRequest.student.level,
      classe: teacherRequest.student.classe,
      postalCode: teacherRequest.student.postalCode,
    }));
  }

  private async assertOwnedStudent(
    portalAccount: AuthenticatedPortalAccount,
    studentId: string,
  ) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, name: true, parentLeadId: true },
    });
    if (!student || student.parentLeadId !== portalAccount.leadId) {
      throw new NotFoundException('Élève introuvable');
    }
    return student;
  }

  private async loadOwnedRequest(portalAccount: AuthenticatedPortalAccount, requestId: string) {
    const request = await this.prisma.teacherRequest.findUnique({
      where: { id: requestId },
      include: { student: { select: { parentLeadId: true, name: true } } },
    });
    // 404 (pas 403) si la demande n'appartient pas a ce compte.
    if (!request || request.student.parentLeadId !== portalAccount.leadId) {
      throw new NotFoundException('Demande introuvable');
    }
    return request;
  }

  private async loadOwnedMatching(
    portalAccount: AuthenticatedPortalAccount,
    matchingId: string,
  ) {
    const matching = await this.prisma.matching.findUnique({
      where: { id: matchingId },
      include: {
        teacher: { select: teacherContactSelect },
        teacherRequest: {
          select: {
            id: true,
            studentId: true,
            subject: true,
            student: { select: { parentLeadId: true, name: true } },
          },
        },
      },
    });

    // 404 (pas 403) si le matching n'existe pas OU n'appartient pas à ce compte —
    // même principe que FamilyService.getStudent.
    if (!matching || matching.teacherRequest.student.parentLeadId !== portalAccount.leadId) {
      throw new NotFoundException('Proposition introuvable');
    }

    return matching;
  }
}
