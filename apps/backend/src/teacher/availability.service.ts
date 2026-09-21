import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { parseFamilyAvailability, slotWarnings } from './availability.util';

// Controle "non bloquant" : un creneau hors disponibilites (famille ou prof)
// est signale, et n'est accepte que si l'enseignant le confirme explicitement.
@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  async assertSlotsOk(
    studentId: string,
    teacherId: string,
    subject: string,
    slots: { dayOfWeek: number; time: string }[],
    confirmed = false,
  ) {
    const [request, teacher] = await Promise.all([
      this.prisma.teacherRequest.findFirst({
        where: { studentId, subject, status: 'acceptee' },
        orderBy: { createdAt: 'desc' },
        select: { availability: true },
      }),
      this.prisma.teacher.findUnique({ where: { id: teacherId }, select: { availabilityDays: true } }),
    ]);
    const family = parseFamilyAvailability(request?.availability);
    const teacherDays = teacher?.availabilityDays ?? [];

    const warnings = [
      ...new Set(slots.flatMap((slot) => slotWarnings(slot, family, teacherDays))),
    ];
    if (warnings.length > 0 && !confirmed) {
      throw new ConflictException({
        code: 'OUT_OF_AVAILABILITY',
        message: 'Ce créneau est en dehors des disponibilités déclarées.',
        warnings,
      });
    }
  }
}
