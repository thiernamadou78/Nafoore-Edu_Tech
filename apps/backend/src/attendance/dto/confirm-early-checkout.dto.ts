import { IsString, MaxLength, MinLength } from 'class-validator';

export class ConfirmEarlyCheckoutDto {
  @IsString()
  sessionId: string;

  @IsString()
  @MinLength(1, { message: 'Merci de préciser la raison' })
  @MaxLength(500)
  reason: string;
}
