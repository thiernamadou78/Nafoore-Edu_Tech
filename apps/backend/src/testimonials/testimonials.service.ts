import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTestimonialDto } from './dto/create-testimonial.dto';
import { UpdateTestimonialDto } from './dto/update-testimonial.dto';

@Injectable()
export class TestimonialsService {
  constructor(private readonly prisma: PrismaService) {}

  listPublished() {
    return this.prisma.testimonial.findMany({
      where: { published: true },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
  }

  listAll() {
    return this.prisma.testimonial.findMany({
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
  }

  // Un nouveau temoignage se place a la fin de la liste.
  async create(dto: CreateTestimonialDto) {
    const last = await this.prisma.testimonial.aggregate({ _max: { order: true } });
    return this.prisma.testimonial.create({
      data: { ...dto, order: (last._max.order ?? 0) + 1 },
    });
  }

  // Nouvel ordre complet (liste des ids du 1er au dernier) : positions
  // renumerotees 1, 2, 3… — plus d'egalites possibles entre temoignages.
  async reorder(ids: string[]) {
    const existing = await this.prisma.testimonial.findMany({ select: { id: true } });
    const known = new Set(existing.map((t) => t.id));
    const ordered = [
      ...ids.filter((id) => known.has(id)),
      ...existing.map((t) => t.id).filter((id) => !ids.includes(id)),
    ];
    await this.prisma.$transaction(
      ordered.map((id, index) =>
        this.prisma.testimonial.update({ where: { id }, data: { order: index + 1 } }),
      ),
    );
    return this.listAll();
  }

  async update(id: string, dto: UpdateTestimonialDto) {
    await this.findOneRaw(id);
    return this.prisma.testimonial.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOneRaw(id);
    await this.prisma.testimonial.delete({ where: { id } });
  }

  private async findOneRaw(id: string) {
    const testimonial = await this.prisma.testimonial.findUnique({ where: { id } });
    if (!testimonial) {
      throw new NotFoundException('Témoignage introuvable');
    }
    return testimonial;
  }
}
