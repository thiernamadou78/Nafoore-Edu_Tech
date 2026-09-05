import { Injectable, NotFoundException } from '@nestjs/common';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';

interface PendingAmendment {
  type: 'montant_revise' | 'formule_changee' | 'duree_prolongee';
  ancienneValeur: string | null;
  nouvelleValeur: string;
}

@Injectable()
export class ContractsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLog: ActivityLogService,
  ) {}

  async createForEnterprise(enterpriseId: string, dto: CreateContractDto, actorId: string) {
    const enterprise = await this.prisma.enterprise.findUnique({ where: { id: enterpriseId } });
    if (!enterprise) {
      throw new NotFoundException('Entreprise introuvable');
    }
    const formula = await this.prisma.formula.findUnique({ where: { id: dto.formulaId } });
    if (!formula) {
      throw new NotFoundException('Formule introuvable');
    }

    const contract = await this.prisma.enterpriseContract.create({
      data: {
        enterpriseId,
        formulaId: dto.formulaId,
        budgetCreditOverride: dto.budgetCreditOverride,
        dateDebut: new Date(dto.dateDebut),
        dateExpiration: new Date(dto.dateExpiration),
      },
      include: { formula: true },
    });

    await this.activityLog.log(
      actorId,
      'create_enterprise_contract',
      'enterprise_contracts',
      contract.id,
    );

    return contract;
  }

  async update(id: string, dto: UpdateContractDto, actorId: string) {
    const contract = await this.findOneRaw(id);

    if (dto.formulaId && dto.formulaId !== contract.formulaId) {
      const formula = await this.prisma.formula.findUnique({ where: { id: dto.formulaId } });
      if (!formula) {
        throw new NotFoundException('Formule introuvable');
      }
    }

    const amendments: PendingAmendment[] = [];
    if (dto.formulaId && dto.formulaId !== contract.formulaId) {
      amendments.push({
        type: 'formule_changee',
        ancienneValeur: contract.formulaId,
        nouvelleValeur: dto.formulaId,
      });
    }
    if (
      dto.budgetCreditOverride !== undefined &&
      dto.budgetCreditOverride !== contract.budgetCreditOverride
    ) {
      amendments.push({
        type: 'montant_revise',
        ancienneValeur: contract.budgetCreditOverride?.toString() ?? null,
        nouvelleValeur: dto.budgetCreditOverride.toString(),
      });
    }
    if (
      dto.dateExpiration &&
      new Date(dto.dateExpiration).getTime() !== contract.dateExpiration.getTime()
    ) {
      amendments.push({
        type: 'duree_prolongee',
        ancienneValeur: contract.dateExpiration.toISOString(),
        nouvelleValeur: new Date(dto.dateExpiration).toISOString(),
      });
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.enterpriseContract.update({
        where: { id },
        data: {
          formulaId: dto.formulaId,
          budgetCreditOverride: dto.budgetCreditOverride,
          dateExpiration: dto.dateExpiration ? new Date(dto.dateExpiration) : undefined,
          statut: dto.statut,
        },
        include: { formula: true },
      });
      for (const amendment of amendments) {
        await tx.contractAmendment.create({
          data: { contractId: id, createdById: actorId, ...amendment },
        });
      }
      return result;
    });

    await this.activityLog.log(
      actorId,
      'update_enterprise_contract',
      'enterprise_contracts',
      id,
    );

    return updated;
  }

  async listAmendments(contractId: string) {
    await this.findOneRaw(contractId);
    return this.prisma.contractAmendment.findMany({
      where: { contractId },
      include: { createdBy: { select: { id: true, name: true } } },
      orderBy: { dateEffet: 'desc' },
    });
  }

  private async findOneRaw(id: string) {
    const contract = await this.prisma.enterpriseContract.findUnique({ where: { id } });
    if (!contract) {
      throw new NotFoundException('Contrat introuvable');
    }
    return contract;
  }
}
