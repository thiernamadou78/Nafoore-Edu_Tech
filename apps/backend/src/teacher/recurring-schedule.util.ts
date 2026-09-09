export interface ScheduleSlot {
  dayOfWeek: number; // ISO : 1 = lundi ... 7 = dimanche
  time: string; // "HH:mm"
}

/**
 * Prochaines occurrences d'un créneau hebdomadaire à partir de `from`
 * (incluse si l'heure n'est pas encore passée). Utilisé pour matérialiser
 * un planning récurrent en vraies Session sur une fenêtre glissante.
 */
export function nextOccurrences(slot: ScheduleSlot, weeksAhead: number, from: Date): Date[] {
  const [hours, minutes] = slot.time.split(':').map(Number);
  const jsDay = slot.dayOfWeek === 7 ? 0 : slot.dayOfWeek;

  const cursor = new Date(from);
  cursor.setHours(hours, minutes, 0, 0);
  const diff = (jsDay - cursor.getDay() + 7) % 7;
  cursor.setDate(cursor.getDate() + diff);
  if (cursor.getTime() < from.getTime()) {
    cursor.setDate(cursor.getDate() + 7);
  }

  const dates: Date[] = [];
  for (let i = 0; i < weeksAhead; i++) {
    dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 7);
  }
  return dates;
}
