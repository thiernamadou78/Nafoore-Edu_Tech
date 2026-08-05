import { IsString, MinLength } from 'class-validator';

export class AssignLeadDto {
  @IsString()
  @MinLength(1)
  assignedToId: string;
}
