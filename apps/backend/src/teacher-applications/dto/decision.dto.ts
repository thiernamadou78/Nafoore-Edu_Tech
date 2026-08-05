import { IsIn } from 'class-validator';

export const DECISION_STATUSES = ['valide', 'refuse', 'documents_requis'] as const;

export class DecisionDto {
  @IsIn(DECISION_STATUSES, {
    message: `status doit être : ${DECISION_STATUSES.join(', ')}`,
  })
  status: (typeof DECISION_STATUSES)[number];
}
