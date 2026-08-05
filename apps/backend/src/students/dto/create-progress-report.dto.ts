import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateProgressReportDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  period?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  content: string;

  @IsOptional()
  @IsBoolean()
  shareable?: boolean;
}
