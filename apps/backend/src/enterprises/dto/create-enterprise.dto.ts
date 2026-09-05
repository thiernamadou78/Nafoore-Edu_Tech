import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateEnterpriseDto {
  @IsString()
  @MinLength(2, { message: 'La raison sociale doit faire au moins 2 caractères' })
  @MaxLength(200)
  raisonSociale: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  siret?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  secteurActivite?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  emailDomain?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  adresseFacturation?: string;
}
