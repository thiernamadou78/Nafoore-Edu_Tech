import { IsDateString, IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateContractDto {
  @IsOptional()
  @IsString()
  formulaId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  budgetCreditOverride?: number;

  @IsOptional()
  @IsDateString()
  dateExpiration?: string;

  @IsOptional()
  @IsIn(['brouillon', 'actif', 'expire', 'renouvele', 'resilie'], {
    message: 'Statut invalide',
  })
  statut?: string;
}
