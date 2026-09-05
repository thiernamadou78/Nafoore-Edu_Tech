import {
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateFormulaDto {
  @IsString()
  @MinLength(2, { message: 'Le nom doit faire au moins 2 caractères' })
  @MaxLength(100)
  nom: string;

  @IsNumber()
  @Min(0)
  budgetCreditDefault: number;

  @IsIn(['euros', 'heures'], { message: 'Unité de crédit invalide' })
  uniteCredit: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  plafondBeneficiairesParEmploye?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  matieresEligibles?: string[];
}
