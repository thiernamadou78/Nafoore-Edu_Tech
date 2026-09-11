import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GeocodingService } from '../geocoding/geocoding.service';
import { CreateContactDto } from './dto/create-contact.dto';

@Injectable()
export class ContactsService {
  private readonly logger = new Logger(ContactsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly geocoding: GeocodingService,
  ) {}

  async create(dto: CreateContactDto) {
    const lead = await this.prisma.lead.create({
      data: {
        profile: dto.profile,
        name: dto.name,
        email: dto.email,
        phone: dto.phone ?? null,
        message: dto.message,
        address: dto.address ?? null,
        desiredStartDate: dto.desiredStartDate ? new Date(dto.desiredStartDate) : null,
        childrenCount: dto.childrenCount ?? null,
      },
    });

    // Best-effort, en tâche de fond : ne doit jamais retarder la réponse du
    // formulaire de contact ni faire échouer la création du lead.
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
}
