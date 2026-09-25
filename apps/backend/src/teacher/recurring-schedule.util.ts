import { getPlatformTimezone, zonedParts, zonedTimeToUtc } from '../common/timezone';

export interface ScheduleSlot {
  dayOfWeek: number; // ISO : 1 = lundi ... 7 = dimanche
  time: string; // "HH:mm"
}

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Un prof ne peut pas donner deux cours en meme temps : ce creneau (jour +
 * heure + duree) chevauche-t-il l'autre ? Meme jour ET intervalles [debut,
 * fin) qui se recoupent.
 */
export function slotsOverlap(
  a: ScheduleSlot,
  durationMinutesA: number,
  b: ScheduleSlot,
  durationMinutesB: number,
): boolean {
  if (a.dayOfWeek !== b.dayOfWeek) return false;
  const startA = toMinutes(a.time);
  const endA = startA + durationMinutesA;
  const startB = toMinutes(b.time);
  const endB = startB + durationMinutesB;
  return startA < endB && startB < endA;
}

/**
 * Prochaines occurrences d'un créneau hebdomadaire à partir de `from`
 * (incluse si l'heure n'est pas encore passée). Utilisé pour matérialiser
 * un planning récurrent en vraies Session sur une fenêtre glissante.
 *
 * Le créneau ("mardi 18:00") est lu dans le fuseau de la plateforme (réglage
 * Super Admin), pas dans celui du serveur : sinon un cours à 18:00 à Paris
 * était créé à 18:00 UTC (20:00 à Paris). Heure d'été / d'hiver comprises.
 */
export function nextOccurrences(
  slot: ScheduleSlot,
  weeksAhead: number,
  from: Date,
  tz = getPlatformTimezone(),
): Date[] {
  const [hours, minutes] = slot.time.split(':').map(Number);
  const today = zonedParts(from, tz);
  // Premier jour (dans le fuseau) qui tombe sur le bon jour de semaine.
  let offset = (slot.dayOfWeek - today.weekday + 7) % 7;
  if (zonedTimeToUtc(today.year, today.month, today.day + offset, hours, minutes, tz) < from) {
    offset += 7;
  }

  const dates: Date[] = [];
  for (let i = 0; i < weeksAhead; i++) {
    dates.push(zonedTimeToUtc(today.year, today.month, today.day + offset + i * 7, hours, minutes, tz));
  }
  return dates;
}
