import { IsIn } from 'class-validator';

export const TEACHER_DOCUMENT_TYPES = ['cv', 'piece_identite', 'diplome', 'casier_judiciaire', 'autre'] as const;

export class CreateTeacherDocumentDto {
  @IsIn(TEACHER_DOCUMENT_TYPES, {
    message: `type doit être : ${TEACHER_DOCUMENT_TYPES.join(', ')}`,
  })
  type: string;
}
