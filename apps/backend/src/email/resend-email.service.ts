import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import {
  EmailService,
  SendEmailInput,
  SendEmailResult,
} from './email.service';

@Injectable()
export class ResendEmailService extends EmailService {
  private readonly logger = new Logger(ResendEmailService.name);
  private readonly client: Resend | null;
  private readonly fromEmail: string;

  constructor() {
    super();
    const apiKey = process.env.RESEND_API_KEY;
    this.client = apiKey ? new Resend(apiKey) : null;
    this.fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@nafoore.fr';
  }

  async send({ to, subject, html }: SendEmailInput): Promise<SendEmailResult> {
    if (!this.client) {
      this.logger.warn(
        `[EmailService] RESEND_API_KEY absente — email non envoyé. To: ${to} | Subject: ${subject}\n${html}`,
      );
      return { providerId: undefined };
    }

    const { data, error } = await this.client.emails.send({
      from: this.fromEmail,
      to,
      subject,
      html,
    });

    if (error) {
      this.logger.error(`Échec d'envoi email à ${to}: ${error.message}`);
      throw new Error(error.message);
    }

    return { providerId: data?.id };
  }
}
