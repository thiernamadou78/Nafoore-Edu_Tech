import { IsIn } from 'class-validator';

export const SUPPORT_TICKET_STATUSES = ['ouvert', 'traite'] as const;

export class UpdateSupportTicketDto {
  @IsIn(SUPPORT_TICKET_STATUSES)
  status: string;
}
