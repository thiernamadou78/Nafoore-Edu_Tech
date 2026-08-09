import { IsIn, IsOptional } from 'class-validator';

export const TEACHER_REQUEST_STATUSES = [
  'en_attente',
  'proposition_envoyee',
  'acceptee',
  'annulee',
] as const;

export class ListTeacherRequestsQueryDto {
  @IsOptional()
  @IsIn(TEACHER_REQUEST_STATUSES)
  status?: string;
}
