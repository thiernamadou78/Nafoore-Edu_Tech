import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RefuseMatchingDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  refusalReason?: string;
}
