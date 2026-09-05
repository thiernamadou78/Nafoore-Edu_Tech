import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEnterpriseDto } from './dto/create-enterprise.dto';
import { ListEnterprisesQueryDto } from './dto/list-enterprises-query.dto';
import { UpdateEnterpriseDto } from './dto/update-enterprise.dto';

@Injectable()
export class EnterprisesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListEnterprisesQueryDto) {
    const enterprises = await this.prisma.enterprise.findMany({
      where: query.search
        ? { raisonSociale: { contains: query.search, mode: 'insensitive' } }
        : undefined,
      include: {
        contracts: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true, statut: true, dateExpiration: true },
        },
      },
      orderBy: { raisonSociale: 'asc' },
    });

    return enterprises.map(({ contracts, ...enterprise }) => ({
      ...enterprise,
      activeContract: contracts[0] ?? null,
    }));
  }

  async findOne(id: string) {
    const enterprise = await this.prisma.enterprise.findUnique({
      where: { id },
      include: {
        contracts: {
          orderBy: { createdAt: 'desc' },
          include: { formula: true, amendments: { orderBy: { dateEffet: 'desc' } } },
        },
        rhAccounts: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!enterprise) {
      throw new NotFoundException('Entreprise introuvable');
    }
    return enterprise;
  }

  async create(dto: CreateEnterpriseDto) {
    await this.assertSiretAvailable(dto.siret);
    return this.prisma.enterprise.create({ data: dto });
  }

  async update(id: string, dto: UpdateEnterpriseDto) {
    await this.findOneRaw(id);
    await this.assertSiretAvailable(dto.siret, id);
    return this.prisma.enterprise.update({ where: { id }, data: dto });
  }

  private async assertSiretAvailable(siret: string | undefined, excludeId?: string) {
    if (!siret) return;
    const existing = await this.prisma.enterprise.findUnique({ where: { siret } });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException('Une entreprise existe déjà avec ce SIRET');
    }
  }

  private async findOneRaw(id: string) {
    const enterprise = await this.prisma.enterprise.findUnique({ where: { id } });
    if (!enterprise) {
      throw new NotFoundException('Entreprise introuvable');
    }
    return enterprise;
  }
}
