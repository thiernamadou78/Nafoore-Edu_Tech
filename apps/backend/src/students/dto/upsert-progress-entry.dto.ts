import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';

export const PROGRESS_ENTRY_STATUSES = ['acquis', 'en_progres', 'a_surveiller'] as const;

export class UpsertProgressEntryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  subject: string;

  @IsIn(PROGRESS_ENTRY_STATUSES)
  status: string;
}
