import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContactDto } from './dto/create-contact.dto';

@Injectable()
export class ContactsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateContactDto) {
    return this.prisma.lead.create({
      data: {
        profile: dto.profile,
        name: dto.name,
        email: dto.email,
        phone: dto.phone ?? null,
        message: dto.message,
      },
    });
  }
}
