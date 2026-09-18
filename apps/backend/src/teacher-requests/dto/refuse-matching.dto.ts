import { IsString, MaxLength, MinLength } from 'class-validator';

export class RefuseMatchingDto {
  @IsString({ message: 'Indiquez le motif du refus' })
  @MinLength(3, { message: 'Indiquez le motif du refus (3 caractères minimum)' })
  @MaxLength(500)
  refusalReason: string;
}
