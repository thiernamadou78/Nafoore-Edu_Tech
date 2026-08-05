import { IsIn } from 'class-validator';

export const DOCUMENT_TYPES = ['bulletin', 'compte_rendu', 'autre'] as const;

export class CreateDocumentDto {
  @IsIn(DOCUMENT_TYPES, {
    message: `type doit être : ${DOCUMENT_TYPES.join(', ')}`,
  })
  type: string;
}
