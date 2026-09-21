import { DAYS_OF_WEEK } from '../common/days';

export interface FamilyAvailability {
  days: string[];
  slots: { label: string; start: number; end: number }[];
}

// La demande de la famille stocke "jours · creneaux" (ex: "Samedi, Dimanche ·
// Matin (8h-12h)") : on retrouve jours et plages horaires par appartenance.
export function parseFamilyAvailability(text?: string | null): FamilyAvailability {
  const tokens = (text ?? '')
    .split(/ · |, /)
    .map((t) => t.trim())
    .filter(Boolean);
  const days = tokens.filter((t) => (DAYS_OF_WEEK as readonly string[]).includes(t));
  const slots = tokens.flatMap((label) => {
    const m = label.match(/\((\d{1,2})h-(\d{1,2})h\)/);
    return m ? [{ label, start: Number(m[1]) * 60, end: Number(m[2]) * 60 }] : [];
  });
  return { days, slots };
}

export function slotWarnings(
  slot: { dayOfWeek: number; time: string },
  family: FamilyAvailability,
  teacherDays: string[],
): string[] {
  const dayName = DAYS_OF_WEEK[slot.dayOfWeek - 1];
  const [h, m] = slot.time.split(':').map(Number);
  const minutes = h * 60 + m;
  const warnings: string[] = [];

  if (family.days.length > 0 && !family.days.includes(dayName)) {
    warnings.push(
      `La famille a indiqué être disponible : ${family.days.join(', ')} (ce créneau tombe un ${dayName.toLowerCase()}).`,
    );
  }
  if (
    family.slots.length > 0 &&
    !family.slots.some((s) => minutes >= s.start && minutes < s.end)
  ) {
    warnings.push(
      `La famille souhaite : ${family.slots.map((s) => s.label).join(', ')} (ce créneau est à ${slot.time}).`,
    );
  }
  if (teacherDays.length > 0 && !teacherDays.includes(dayName)) {
    warnings.push(
      `Tu as indiqué ne pas être disponible le ${dayName.toLowerCase()} (jours déclarés : ${teacherDays.join(', ')}).`,
    );
  }
  return warnings;
}
