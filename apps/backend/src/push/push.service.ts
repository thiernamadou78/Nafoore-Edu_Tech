import { Injectable, Logger } from '@nestjs/common';
import * as webpush from 'web-push';
import { PrismaService } from '../prisma/prisma.service';
import { SubscribePushDto } from './dto/subscribe-push.dto';

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private readonly enabled: boolean;

  constructor(private readonly prisma: PrismaService) {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    this.enabled = Boolean(publicKey && privateKey);
    if (this.enabled) {
      webpush.setVapidDetails(
        process.env.VAPID_SUBJECT || 'mailto:contact@nafoore.fr',
        publicKey as string,
        privateKey as string,
      );
    }
  }

  subscribe(teacherId: string, dto: SubscribePushDto) {
    return this.prisma.pushSubscription.upsert({
      where: { endpoint: dto.endpoint },
      create: {
        teacherId,
        endpoint: dto.endpoint,
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
      },
      update: {
        teacherId,
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
      },
    });
  }

  async unsubscribe(endpoint: string) {
    await this.prisma.pushSubscription.deleteMany({ where: { endpoint } });
    return { success: true };
  }

  async sendToTeacher(teacherId: string, payload: PushPayload) {
    if (!this.enabled) {
      this.logger.warn(
        `[Push] VAPID non configuré — notification non envoyée. Teacher ${teacherId}: ${payload.title} — ${payload.body}`,
      );
      return;
    }

    const subscriptions = await this.prisma.pushSubscription.findMany({ where: { teacherId } });
    for (const subscription of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          JSON.stringify(payload),
        );
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          // Abonnement expiré ou révoqué côté navigateur : on le supprime.
          await this.prisma.pushSubscription.delete({ where: { id: subscription.id } }).catch(() => {});
        } else {
          this.logger.error(
            `Échec d'envoi push (subscription ${subscription.id})`,
            error instanceof Error ? error.stack : undefined,
          );
        }
      }
    }
  }
}
