export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  // Pieces jointes (ex. CSV du rapport mensuel).
  attachments?: { filename: string; content: string }[];
}

export interface SendEmailResult {
  providerId?: string;
}

export abstract class EmailService {
  abstract send(input: SendEmailInput): Promise<SendEmailResult>;
}
