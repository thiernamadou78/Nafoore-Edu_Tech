import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { renderMatchingConfirmationEmail } from '../email/templates/matching-confirmation.template';
import { renderMatchingProposalEmail } from '../email/templates/matching-proposal.template';
import { renderTeacherProposedEmail } from '../email/templates/teacher-proposed.template';
import { renderMatchingResponseEmail } from '../email/templates/matching-response.template';
import { GeocodingService } from '../geocoding/geocoding.service';
import { resolvePortalUrl } from '../email/portal-url.util';
import { StudentsService } from '../students/students.service';
import { AuthenticatedPortalAccount } from '../auth/portal-auth.guard';
import { AuthenticatedTeacherAccount } from '../auth/teacher-auth.guard';
import { CreateTeacherRequestDto } from './dto/create-teacher-request.dto';
import { UpdateTeacherRequestDto } from './dto/update-teacher-request.dto';
import { ProposeMatchingDto } from './dto/propose-matching.dto';
import { RefuseMatchingDto } from './dto/refuse-matching.dto';
import { ListTeacherRequestsQueryDto } from './dto/list-teacher-requests-query.dto';

const adminMatchingSelect = {
  id: true,
  status: true,
  createdAt: true,
  respondedAt: true,
  refusalReason: true,
  teacher: { select: { id: true, name: true } },
  proposedBy: { select: { id: true, name: true } },
};

const teacherContactSelect = {
  id: true,
  name: true,
  gender: true,
  account: { select: { email: true } },
};

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
    private readonly studentsService: StudentsService,
    private readonly emailService: EmailService,
    private readonly geocoding: GeocodingService,
  ) {}

  async createRequest(
    portalAccount: AuthenticatedPortalAccount,
    studentId: string,
    dto: CreateTeacherRequestDto,
  ) {
    await this.assertOwnedStudent(portalAccount, studentId);

    return this.prisma.teacherRequest.create({
      data: {
        studentId,
        subject: dto.subject,
        frequency: dto.frequency,
        format: dto.format,
        availability: dto.availability,
        durationMinutes: dto.durationMinutes,
        desiredStartDate: dto.desiredStartDate ? new Date(dto.desiredStartDate) : null,
      },
    });
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
    outcome: 'acceptee' | 'refusee' | 'annulee',
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

    this.notifyTeacher(
      matching.teacher,
      matching.teacherRequest.student.name,
      matching.teacherRequest.subject,
      'refusee',
      dto.refusalReason.trim(),
    );

    return { status: 'refusee' };
  }

  listForAdmin(query: ListTeacherRequestsQueryDto) {
    return this.prisma.teacherRequest.findMany({
      where: { status: query.status },
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
        address: true,
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
            teacherAddress: teacher.address,
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
      select: { subjects: true },
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
        availability: true,
        desiredStartDate: true,
        // Volontairement ni adresse complete ni nom de l'eleve : seulement
        // classe, code postal et ville.
        student: { select: { level: true, classe: true, postalCode: true } },
        interests: { where: { teacherId }, select: { interested: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(
      requests.map(async ({ interests, student, ...request }) => ({
        ...request,
        level: student.level,
        classe: student.classe,
        postalCode: student.postalCode,
        city: await this.geocoding.cityForPostalCode(student.postalCode),
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
      select: { id: true, parentLeadId: true },
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
