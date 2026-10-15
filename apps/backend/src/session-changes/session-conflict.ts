import { ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const MAX_SESSION_MINUTES = 240;

// Un enseignant ne peut pas donner deux cours en meme temps : meme regle
// que cote enseignant (TeacherService.assertNoConflict), partagee avec la
// planification par l'admin.
export async function assertNoTeacherConflict(
  prisma: PrismaService,
  teacherId: string,
  startsAt: Date,
  durationMinutes: number,
  excludeSessionId?: string,
) {
  const endsAt = new Date(startsAt.getTime() + durationMinutes * 60000);
  const candidates = await prisma.session.findMany({
    where: {
      teacherId,
      status: { not: 'annulee' },
      id: excludeSessionId ? { not: excludeSessionId } : undefined,
      date: {
        gte: new Date(startsAt.getTime() - MAX_SESSION_MINUTES * 60000),
        lt: endsAt,
      },
    },
    include: { student: { select: { name: true } }, teacher: { select: { name: true } } },
  });
  const conflict = candidates.find((c) => new Date(c.date.getTime() + c.durationMinutes * 60000) > startsAt);
  if (conflict) {
    throw new ConflictException(
      `${conflict.teacher?.name ?? 'L’enseignant'} a déjà une séance sur ce créneau avec ${conflict.student.name}`,
    );
  }
}
