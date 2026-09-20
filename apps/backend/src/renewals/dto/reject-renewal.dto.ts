import { IsString, MaxLength, MinLength } from 'class-validator';

export class RejectRenewalDto {
  @IsString({ message: 'Indiquez le motif du refus' })
  @MinLength(3, { message: 'Indiquez le motif du refus (3 caractères minimum)' })
  @MaxLength(500)
  reason: string;
}
