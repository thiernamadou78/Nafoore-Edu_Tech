import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { PrismaService } from '../prisma/prisma.service';
import { generateQrToken } from '../students/qr-token.util';
import { CommitImportDto } from './dto/commit-import.dto';
import { PreviewImportDto } from './dto/preview-import.dto';
import {
  ImportRowDraft,
  normalizeText,
  parseWorkbook,
  validateRow,
} from './workbook-parser.util';

const EXCEL_MIMETYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
];

export interface RowError {
  rowNumber: number;
  message: string;
}

@Injectable()
export class ImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLog: ActivityLogService,
  ) {}

  async preview(enterpriseId: string, dto: PreviewImportDto, file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Fichier manquant');
    }
    if (!EXCEL_MIMETYPES.includes(file.mimetype)) {
      throw new BadRequestException('Format de fichier non supporté (.xlsx ou .xls attendu)');
    }
    await this.assertContractBelongsToEnterprise(enterpriseId, dto.contractId);

    const rawRows = await parseWorkbook(file.buffer);

    const errors: RowError[] = [];
    const drafts: ImportRowDraft[] = [];

    for (const raw of rawRows) {
      const { errors: rowErrors, row } = validateRow(raw);
      if (rowErrors.length > 0) {
        errors.push({ rowNumber: raw.rowNumber, message: rowErrors.join(', ') });
      } else if (row) {
        drafts.push(row);
      }
    }

    const { toCreate, duplicates } = await this.classifyRows(enterpriseId, drafts);

    return { toCreate, duplicates, errors };
  }

  async commit(enterpriseId: string, dto: CommitImportDto, actorId: string) {
    await this.assertContractBelongsToEnterprise(enterpriseId, dto.contractId);

    let createdCount = 0;
    let skippedCount = 0;

    const batch = await this.prisma.$transaction(async (tx) => {
      for (const row of dto.rows) {
        let employee = await tx.employee.findUnique({
          where: { enterpriseId_emailPro: { enterpriseId, emailPro: row.emailPro } },
        });
        if (!employee) {
          employee = await tx.employee.create({
            data: {
              enterpriseId,
              contractId: dto.contractId,
              nom: row.nomEmploye,
              prenom: row.prenomEmploye,
              emailPro: row.emailPro,
            },
          });
        }

        const childName = `${row.prenomEnfant} ${row.nomEnfant}`;
        const alreadyLinked = await tx.fundingLink.findFirst({
          where: {
            employeeId: employee.id,
            student: { name: { equals: childName, mode: 'insensitive' } },
          },
        });
        if (alreadyLinked) {
          skippedCount += 1;
          continue;
        }

        const student = await tx.student.create({
          data: {
            name: childName,
            level: row.niveauScolaire,
            dateNaissance: new Date(row.dateNaissance),
            qrToken: generateQrToken(),
          },
        });

        await tx.fundingLink.create({
          data: {
            studentId: student.id,
            fundingSource: 'enterprise',
            employeeId: employee.id,
            status: 'active',
          },
        });

        createdCount += 1;
      }

      return tx.importBatch.create({
        data: {
          enterpriseId,
          contractId: dto.contractId,
          fileName: dto.fileName,
          createdCount,
          skippedCount,
          createdById: actorId,
        },
      });
    });

    await this.activityLog.log(actorId, 'import_beneficiaires', 'import_batches', batch.id);

    return batch;
  }

  listBatches(enterpriseId: string) {
    return this.prisma.importBatch.findMany({
      where: { enterpriseId },
      include: {
        contract: { include: { formula: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async classifyRows(enterpriseId: string, drafts: ImportRowDraft[]) {
    const emails = [...new Set(drafts.map((d) => d.emailPro.toLowerCase()))];
    const existingEmployees = await this.prisma.employee.findMany({
      where: { enterpriseId, emailPro: { in: emails, mode: 'insensitive' } },
      include: { fundingLinks: { include: { student: { select: { name: true } } } } },
    });
    const employeeByEmail = new Map(
      existingEmployees.map((employee) => [employee.emailPro.toLowerCase(), employee]),
    );

    const toCreate: ImportRowDraft[] = [];
    const duplicates: ImportRowDraft[] = [];
    const seenInFile = new Set<string>();

    for (const draft of drafts) {
      const childKey = normalizeText(`${draft.prenomEnfant} ${draft.nomEnfant}`);
      const emailKey = draft.emailPro.toLowerCase();
      const fileKey = `${emailKey}|${childKey}`;

      const existingEmployee = employeeByEmail.get(emailKey);
      const alreadyLinked = existingEmployee?.fundingLinks.some(
        (link) => normalizeText(link.student.name) === childKey,
      );

      if (alreadyLinked || seenInFile.has(fileKey)) {
        duplicates.push(draft);
      } else {
        toCreate.push(draft);
        seenInFile.add(fileKey);
      }
    }

    return { toCreate, duplicates };
  }

  private async assertContractBelongsToEnterprise(enterpriseId: string, contractId: string) {
    const contract = await this.prisma.enterpriseContract.findUnique({
      where: { id: contractId },
    });
    if (!contract || contract.enterpriseId !== enterpriseId) {
      throw new NotFoundException('Contrat introuvable pour cette entreprise');
    }
    return contract;
  }
}
