import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ModerateMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason: string;

  @IsOptional()
  @IsBoolean()
  warn?: boolean;
}
