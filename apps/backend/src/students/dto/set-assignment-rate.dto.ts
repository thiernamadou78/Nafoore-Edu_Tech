import { Type } from 'class-transformer';
import { IsNumber, Max, Min } from 'class-validator';

export class SetAssignmentRateDto {
  @Type(() => Number)
  @IsNumber({}, { message: 'Le tarif horaire est obligatoire' })
  @Min(1, { message: 'Le tarif horaire doit être supérieur à 0' })
  @Max(300, { message: 'Le tarif horaire semble trop élevé' })
  hourlyRate: number;
}
