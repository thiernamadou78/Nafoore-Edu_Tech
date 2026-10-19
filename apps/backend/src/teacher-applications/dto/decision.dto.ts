import { IsBoolean, IsIn, IsOptional } from 'class-validator';

export const DECISION_STATUSES = ['valide', 'refuse', 'documents_requis'] as const;

export class DecisionDto {
  @IsIn(DECISION_STATUSES, {
    message: `status doit être : ${DECISION_STATUSES.join(', ')}`,
  })
  status: (typeof DECISION_STATUSES)[number];

  // L'admin a vu que l'email est deja utilise ailleurs et confirme quand meme.
  @IsOptional()
  @IsBoolean()
  confirmDuplicate?: boolean;
}
