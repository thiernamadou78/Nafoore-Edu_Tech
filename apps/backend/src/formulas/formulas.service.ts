import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFormulaDto } from './dto/create-formula.dto';
import { UpdateFormulaDto } from './dto/update-formula.dto';

@Injectable()
export class FormulasService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.formula.findMany({ orderBy: { nom: 'asc' } });
  }

  findOne(id: string) {
    return this.findOneRaw(id);
  }

  create(dto: CreateFormulaDto) {
    return this.prisma.formula.create({
      data: {
        nom: dto.nom,
        budgetCreditDefault: dto.budgetCreditDefault,
        uniteCredit: dto.uniteCredit,
        plafondBeneficiairesParEmploye: dto.plafondBeneficiairesParEmploye,
        matieresEligibles: dto.matieresEligibles ?? [],
      },
    });
  }

  async update(id: string, dto: UpdateFormulaDto) {
    await this.findOneRaw(id);
    return this.prisma.formula.update({ where: { id }, data: dto });
  }

  private async findOneRaw(id: string) {
    const formula = await this.prisma.formula.findUnique({ where: { id } });
    if (!formula) {
      throw new NotFoundException('Formule introuvable');
    }
    return formula;
  }
}
