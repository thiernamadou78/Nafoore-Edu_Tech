import { IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateContractDto {
  @IsString()
  formulaId: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  budgetCreditOverride?: number;

  @IsDateString()
  dateDebut: string;

  @IsDateString()
  dateExpiration: string;
}
