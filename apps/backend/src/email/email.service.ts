export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

export interface SendEmailResult {
  providerId?: string;
}

export abstract class EmailService {
  abstract send(input: SendEmailInput): Promise<SendEmailResult>;
}
