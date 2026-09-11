import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { GeocodingService } from '../geocoding/geocoding.service';
import { ConvertToStudentDto } from './dto/convert-to-student.dto';
import { CreateFamilyLeadDto } from './dto/create-family-lead.dto';
import { CreateLeadNoteDto } from './dto/create-lead-note.dto';
import { ListLeadsQueryDto } from './dto/list-leads-query.dto';
import { UpdateLeadAddressDto } from './dto/update-lead-address.dto';
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto';
import { generateQrToken } from '../students/qr-token.util';

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLog: ActivityLogService,
    private readonly geocoding: GeocodingService,
  ) {}

  async createFamilyByAdmin(dto: CreateFamilyLeadDto, actorId: string) {
    const lead = await this.prisma.lead.create({
      data: {
        profile: 'famille',
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        address: dto.address ?? null,
        message: 'Famille créée directement depuis l’espace admin.',
        status: 'valide',
      },
    });

    await this.activityLog.log(actorId, 'create_family_lead', 'leads', lead.id);

    if (dto.address) {
      this.geocoding
        .geocode(dto.address)
        .then((coords) => {
          if (!coords) return;
          return this.prisma.lead.update({ where: { id: lead.id }, data: coords });
        })
        .catch((error) => this.logger.warn(`Géocodage du lead ${lead.id} échoué: ${error}`));
    }

    return lead;
  }

  list(query: ListLeadsQueryDto) {
    const where: Prisma.LeadWhereInput = {
      profile: query.profile,
      status: query.status,
      createdAt:
        query.from || query.to
          ? {
              gte: query.from ? new Date(query.from) : undefined,
              lte: query.to ? new Date(query.to) : undefined,
            }
          : undefined,
    };

    return this.prisma.lead.findMany({
      where,
      include: {
        portalAccount: { select: { id: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: {
        notes: {
          include: { adminAccount: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'asc' },
        },
        students: { select: { id: true, name: true, level: true, classe: true, school: true } },
        portalAccount: { select: { id: true, status: true } },
      },
    });
    if (!lead) {
      throw new NotFoundException('Lead introuvable');
    }
    return lead;
  }

  async addNote(id: string, dto: CreateLeadNoteDto, actorId: string) {
    await this.findOne(id);
    return this.prisma.leadNote.create({
      data: { leadId: id, adminAccountId: actorId, note: dto.note },
      include: { adminAccount: { select: { id: true, name: true } } },
    });
  }

  async updateStatus(id: string, dto: UpdateLeadStatusDto, actorId: string) {
    await this.findOne(id);

    const lead = await this.prisma.lead.update({
      where: { id },
      data: { status: dto.status },
    });

    await this.activityLog.log(actorId, 'update_lead_status', 'leads', id);

    return lead;
  }

  async updateAddress(id: string, dto: UpdateLeadAddressDto, actorId: string) {
    await this.findOne(id);

    // Reinitialise les coordonnees le temps du nouveau geocodage — evite
    // d'afficher un pin a l'ancienne position si l'adresse a change.
    const lead = await this.prisma.lead.update({
      where: { id },
      data: { address: dto.address, latitude: null, longitude: null },
    });

    await this.activityLog.log(actorId, 'update_lead_address', 'leads', id);

    this.geocoding
      .geocode(dto.address)
      .then((coords) => {
        if (!coords) return;
        return this.prisma.lead.update({ where: { id }, data: coords });
      })
      .catch((error) => this.logger.warn(`Géocodage du lead ${id} échoué: ${error}`));

    return lead;
  }

  async convertToStudent(
    id: string,
    dto: ConvertToStudentDto,
    actorId: string,
  ) {
    const existingLead = await this.findOne(id);

    const student = await this.prisma.$transaction(async (tx) => {
      const createdStudent = await tx.student.create({
        data: {
          name: existingLead.name,
          level: dto.level,
          parentLeadId: id,
          qrToken: generateQrToken(),
        },
      });
      await tx.lead.update({ where: { id }, data: { status: 'converti' } });
      return createdStudent;
    });

    await this.activityLog.log(
      actorId,
      'convert_lead_to_student',
      'leads',
      id,
    );

    return student;
  }
}
