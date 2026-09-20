import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class RespondRenewalDto {
  @IsBoolean()
  accept: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}
