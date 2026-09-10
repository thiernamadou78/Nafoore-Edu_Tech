import { IsString } from 'class-validator';

export class StartThreadDto {
  @IsString()
  leadId: string;
}
