import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { renderModerationWarningEmail } from '../email/templates/moderation-warning.template';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { ModerateMessageDto } from './dto/moderate-message.dto';
import { UpdateSupportTicketDto } from './dto/update-support-ticket.dto';

@Injectable()
export class AdminMessagingService {
  private readonly logger = new Logger(AdminMessagingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly activityLog: ActivityLogService,
  ) {}

  async listThreads() {
    const threads = await this.prisma.messageThread.findMany({
      include: {
        teacher: { select: { id: true, name: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        _count: { select: { messages: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return threads.map(({ teacher, messages, _count, ...thread }) => ({
      ...thread,
      teacherName: teacher.name,
      messageCount: _count.messages,
      lastMessageAt: messages[0]?.createdAt ?? thread.createdAt,
    }));
  }

  async getThread(id: string) {
    const thread = await this.prisma.messageThread.findUnique({
      where: { id },
      include: {
        teacher: { select: { id: true, name: true } },
        lead: { select: { name: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: { removedBy: { select: { name: true } } },
        },
      },
    });
    if (!thread) {
      throw new NotFoundException('Conversation introuvable');
    }
    const { teacher, lead, ...rest } = thread;
    return { ...rest, teacherName: teacher.name, familyLeadName: lead?.name ?? null };
  }

  async moderateMessage(messageId: string, adminId: string, dto: ModerateMessageDto) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: {
        thread: {
          include: {
            teacher: { select: { name: true, email: true } },
            lead: { select: { portalAccount: { select: { fullName: true, email: true } } } },
          },
        },
      },
    });
    if (!message) {
      throw new NotFoundException('Message introuvable');
    }

    const updated = await this.prisma.message.update({
      where: { id: messageId },
      data: { removedAt: new Date(), removedById: adminId, removedReason: dto.reason },
    });

    await this.activityLog.log(adminId, 'moderate_message', 'messages', messageId);

    if (dto.warn) {
      const recipient =
        message.sender === 'teacher'
          ? message.thread.teacher.email
            ? { email: message.thread.teacher.email, fullName: message.thread.teacher.name }
            : null
          : message.thread.lead?.portalAccount
            ? {
                email: message.thread.lead.portalAccount.email,
                fullName: message.thread.lead.portalAccount.fullName,
              }
            : null;

      if (recipient) {
        try {
          await this.emailService.send({
            to: recipient.email,
            subject: 'Nafoore — Un de vos messages a été retiré',
            html: renderModerationWarningEmail({
              fullName: recipient.fullName,
              reason: dto.reason,
            }),
          });
        } catch (error) {
          this.logger.error(
            `Échec d'envoi de l'avertissement pour le message ${messageId}`,
            error instanceof Error ? error.stack : undefined,
          );
        }
      } else {
        this.logger.warn(`Aucune adresse email disponible pour avertir (message ${messageId})`);
      }
    }

    return updated;
  }

  listSupportTickets() {
    return this.prisma.supportTicket.findMany({
      include: { teacher: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateSupportTicket(id: string, dto: UpdateSupportTicketDto) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) {
      throw new NotFoundException('Ticket introuvable');
    }
    return this.prisma.supportTicket.update({ where: { id }, data: { status: dto.status } });
  }
}
