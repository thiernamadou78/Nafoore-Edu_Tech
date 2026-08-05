import { IsIn } from 'class-validator';

export const LEAD_STATUSES = [
  'nouveau',
  'contacte',
  'en_verification',
  'valide',
  'converti',
  'rejete',
] as const;

export class UpdateLeadStatusDto {
  @IsIn(LEAD_STATUSES, {
    message: `status doit être : ${LEAD_STATUSES.join(', ')}`,
  })
  status: (typeof LEAD_STATUSES)[number];
}
