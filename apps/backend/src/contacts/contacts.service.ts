import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GeocodingService } from '../geocoding/geocoding.service';
import { EmailService } from '../email/email.service';
import { AdminNotificationService } from '../email/admin-notification.service';
import { renderContactReceivedEmail } from '../email/templates/contact-received.template';
import { CreateContactDto } from './dto/create-contact.dto';

@Injectable()
export class ContactsService {
  private readonly logger = new Logger(ContactsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly geocoding: GeocodingService,
    private readonly emailService: EmailService,
    private readonly adminNotification: AdminNotificationService,
  ) {}

  async create(dto: CreateContactDto) {
    const lead = await this.prisma.lead.create({
      data: {
        profile: dto.profile,
        gender: dto.gender,
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        message: dto.message,
        services: dto.services,
        city: dto.city.trim(),
        address: dto.address ?? null,
        postalCode: dto.postalCode ?? null,
        desiredStartDate: dto.desiredStartDate ? new Date(dto.desiredStartDate) : null,
        childrenCount: dto.childrenCount ?? null,
      },
    });

    this.adminNotification.notify({
      subject: `Nouveau lead : ${dto.name}`,
      title: 'Nouveau lead reçu',
      lines: [
        `Nom : ${dto.name}`,
        `Profil : ${dto.profile}`,
        `Email : ${dto.email}`,
        `Téléphone : ${dto.phone}`,
        `Services : ${dto.services.join(', ')}`,
      ],
      path: `/leads/${lead.id}`,
    });

    // Accuse de reception best-effort : ne doit jamais retarder la reponse du
    // formulaire ni faire echouer la creation du lead.
    this.emailService
      .send({
        to: dto.email,
        subject: 'Nafoore Education — Nous avons bien reçu votre demande',
        html: renderContactReceivedEmail({ gender: dto.gender, fullName: dto.name }),
      })
      .catch((error) =>
        this.logger.error(
          `Échec d'envoi de l'accusé de réception pour le lead ${lead.id}`,
          error instanceof Error ? error.stack : undefined,
        ),
      );

    // Best-effort, en tâche de fond : ne doit jamais retarder la réponse du
    // formulaire de contact ni faire échouer la création du lead.
    if (dto.address) {
      this.geocoding
        .geocode(dto.address, dto.postalCode)
        .then((coords) => {
          if (!coords) return;
          return this.prisma.lead.update({ where: { id: lead.id }, data: coords });
        })
        .catch((error) => this.logger.warn(`Géocodage du lead ${lead.id} échoué: ${error}`));
    }

    return lead;
  }
}
