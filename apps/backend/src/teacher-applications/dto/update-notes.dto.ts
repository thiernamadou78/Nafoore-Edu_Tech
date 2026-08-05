import { IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateNotesDto {
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  interviewNotes: string;
}
