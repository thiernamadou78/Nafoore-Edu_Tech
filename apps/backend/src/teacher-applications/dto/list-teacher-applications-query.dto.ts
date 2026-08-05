import { IsIn, IsOptional, IsString } from 'class-validator';

const APPLICATION_STATUSES = [
  'preselection',
  'entretien_planifie',
  'entretien_realise',
  'valide',
  'refuse',
  'documents_requis',
] as const;

export class ListTeacherApplicationsQueryDto {
  @IsOptional()
  @IsIn(APPLICATION_STATUSES)
  status?: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  zone?: string;

  @IsOptional()
  @IsString()
  reviewedBy?: string;
}
