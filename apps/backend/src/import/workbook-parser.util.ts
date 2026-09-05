import { BadRequestException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';

export interface RawImportRow {
  rowNumber: number;
  [key: string]: unknown;
}

export interface ImportRowDraft {
  rowNumber: number;
  nomEmploye: string;
  prenomEmploye: string;
  emailPro: string;
  nomEnfant: string;
  prenomEnfant: string;
  dateNaissance: string;
  niveauScolaire: string;
}

const HEADER_MAP: Record<string, string> = {
  'nom employe': 'nomEmploye',
  'prenom employe': 'prenomEmploye',
  'email pro': 'emailPro',
  'nom enfant': 'nomEnfant',
  'prenom enfant': 'prenomEnfant',
  'date de naissance': 'dateNaissance',
  'niveau scolaire': 'niveauScolaire',
};

export const REQUIRED_TEMPLATE_COLUMNS = [
  'Nom employé',
  'Prénom employé',
  'Email pro',
  'Nom enfant',
  'Prénom enfant',
  'Date de naissance',
  'Niveau scolaire',
];

export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function cellToString(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    const richValue = value as { text?: unknown; richText?: { text: string }[] };
    if (typeof richValue.text === 'string') return richValue.text.trim();
    if (Array.isArray(richValue.richText)) {
      return richValue.richText.map((part) => part.text).join('').trim();
    }
  }
  return String(value).trim();
}

export function parseDateCell(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }
  const text = cellToString(value);
  const match = text.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (match) {
    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);
    if (month < 1 || month > 12 || day < 1 || day > 31) {
      return null;
    }
    const date = new Date(Date.UTC(year, month - 1, day));
    // Rejette les débordements silencieux de Date.UTC (ex. 31/04 -> 1er mai) :
    // on revérifie que les composantes reconstruites correspondent à la saisie.
    if (
      Number.isNaN(date.getTime()) ||
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      return null;
    }
    return date;
  }
  return null;
}

const VALID_NIVEAUX = ['primaire', 'college', 'lycee'];

export function normalizeNiveau(value: string): string | null {
  const normalized = normalizeText(value);
  return VALID_NIVEAUX.includes(normalized) ? normalized : null;
}

export async function parseWorkbook(buffer: Buffer): Promise<RawImportRow[]> {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  } catch {
    throw new BadRequestException('Fichier Excel illisible (.xlsx attendu)');
  }

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new BadRequestException('Le fichier ne contient aucune feuille');
  }

  const headerByColumn = new Map<number, string>();
  worksheet.getRow(1).eachCell({ includeEmpty: true }, (cell, colNumber) => {
    const key = HEADER_MAP[normalizeText(cellToString(cell.value))];
    if (key) headerByColumn.set(colNumber, key);
  });

  const missingKeys = Object.values(HEADER_MAP).filter(
    (key) => ![...headerByColumn.values()].includes(key),
  );
  if (missingKeys.length > 0) {
    throw new BadRequestException(
      `Colonnes manquantes dans le fichier. Colonnes attendues : ${REQUIRED_TEMPLATE_COLUMNS.join(', ')}`,
    );
  }

  const rows: RawImportRow[] = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const record: RawImportRow = { rowNumber };
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const key = headerByColumn.get(colNumber);
      if (key) record[key] = cell.value;
    });
    const hasContent = Object.entries(record).some(
      ([key, value]) => key !== 'rowNumber' && cellToString(value) !== '',
    );
    if (hasContent) rows.push(record);
  });

  return rows;
}

export function validateRow(raw: RawImportRow): { errors: string[]; row?: ImportRowDraft } {
  const errors: string[] = [];

  const nomEmploye = cellToString(raw.nomEmploye);
  const prenomEmploye = cellToString(raw.prenomEmploye);
  const emailPro = cellToString(raw.emailPro);
  const nomEnfant = cellToString(raw.nomEnfant);
  const prenomEnfant = cellToString(raw.prenomEnfant);
  const niveauRaw = cellToString(raw.niveauScolaire);

  if (!nomEmploye) errors.push("nom employé manquant");
  if (!prenomEmploye) errors.push("prénom employé manquant");
  if (!emailPro || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailPro)) {
    errors.push('email pro invalide');
  }
  if (!nomEnfant) errors.push('nom enfant manquant');
  if (!prenomEnfant) errors.push('prénom enfant manquant');

  const dateNaissance = parseDateCell(raw.dateNaissance);
  if (!dateNaissance) errors.push('date de naissance invalide');

  const niveauScolaire = normalizeNiveau(niveauRaw);
  if (!niveauScolaire) errors.push('niveau scolaire invalide (attendu : primaire, college ou lycee)');

  if (errors.length > 0) {
    return { errors };
  }

  return {
    errors: [],
    row: {
      rowNumber: raw.rowNumber,
      nomEmploye,
      prenomEmploye,
      emailPro,
      nomEnfant,
      prenomEnfant,
      dateNaissance: dateNaissance!.toISOString(),
      niveauScolaire: niveauScolaire!,
    },
  };
}
