import { IsEmail, IsIn, IsInt, IsISO8601, IsString, MinLength } from 'class-validator';

export class ImportRowDto {
  @IsInt()
  rowNumber: number;

  @IsString()
  @MinLength(1, { message: "Nom de l'employé manquant" })
  nomEmploye: string;

  @IsString()
  @MinLength(1, { message: "Prénom de l'employé manquant" })
  prenomEmploye: string;

  @IsEmail({}, { message: 'Email pro invalide' })
  emailPro: string;

  @IsString()
  @MinLength(1, { message: "Nom de l'enfant manquant" })
  nomEnfant: string;

  @IsString()
  @MinLength(1, { message: "Prénom de l'enfant manquant" })
  prenomEnfant: string;

  @IsISO8601({}, { message: 'Date de naissance invalide' })
  dateNaissance: string;

  @IsIn(['primaire', 'college', 'lycee'], { message: 'Niveau scolaire invalide' })
  niveauScolaire: string;
}
