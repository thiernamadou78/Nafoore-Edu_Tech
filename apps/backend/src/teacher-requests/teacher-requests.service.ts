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
import { resolvePortalUrl } from '../email/portal-url.util';
import { StudentsService } from '../students/students.service';
import { AuthenticatedPortalAccount } from '../auth/portal-auth.guard';
import { CreateTeacherRequestDto } from './dto/create-teacher-request.dto';
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

@Injectable()
export class TeacherRequestsService {
  private readonly logger = new Logger(TeacherRequestsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly studentsService: StudentsService,
    private readonly emailService: EmailService,
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
      },
    });
  }

  async acceptMatching(portalAccount: AuthenticatedPortalAccount, matchingId: string) {
    const matching = await this.loadOwnedMatching(portalAccount, matchingId);

    if (matching.status !== 'proposee') {
      throw new ConflictException('Cette proposition n\'est plus en attente');
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
        data: { status: 'refusee', respondedAt: new Date() },
      });
      await this.studentsService.addTeacherAssignment(
        matching.teacherRequest.studentId,
        matching.teacherId,
        matching.proposedById,
        matching.teacherRequest.subject,
        tx,
      );
    });

    // Email best-effort en arrière-plan : la famille ne doit pas attendre la
    // réponse du fournisseur d'email pour voir son statut changer.
    this.emailService
      .send({
        to: portalAccount.email,
        subject: `Nafoore Education — Professeur confirmé pour ${matching.teacherRequest.student.name}`,
        html: renderMatchingConfirmationEmail({
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

    return { status: 'acceptee' };
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

    await this.prisma.$transaction([
      this.prisma.matching.update({
        where: { id: matchingId },
        data: {
          status: 'refusee',
          refusalReason: dto.refusalReason,
          respondedAt: new Date(),
        },
      }),
      this.prisma.teacherRequest.update({
        where: { id: matching.teacherRequestId },
        data: { status: 'en_attente' },
      }),
    ]);

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
        subjects: true,
        bio: true,
        address: true,
        verified: true,
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
            fullName: portalAccount.fullName,
            studentName: request.student.name,
            subject: request.subject,
            teacherName: teacher.name,
            teacherSubjects: teacher.subjects,
            teacherBio: teacher.bio,
            teacherAddress: teacher.address,
            teacherVerified: teacher.verified,
            portalUrl: resolvePortalUrl('famille'),
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

    return matching;
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

  private async loadOwnedMatching(
    portalAccount: AuthenticatedPortalAccount,
    matchingId: string,
  ) {
    const matching = await this.prisma.matching.findUnique({
      where: { id: matchingId },
      include: {
        teacher: { select: { id: true, name: true } },
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
