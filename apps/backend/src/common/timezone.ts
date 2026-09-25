// Fuseau horaire de la plateforme (reglage Super Admin, Europe/Paris par
// defaut). Les creneaux saisis ("mardi 18:00") et les dates des emails sont
// interpretes / affiches dans ce fuseau, et non dans celui du serveur (UTC
// sur Render), heure d'ete / d'hiver comprises.
//
// Garde en memoire (lecture synchrone partout) et tenu a jour par
// PlatformTimezoneService (demarrage, modification, puis toutes les minutes).

export const DEFAULT_TIMEZONE = 'Europe/Paris';

export const TIMEZONE_OPTIONS: { value: string; label: string }[] = [
  { value: 'Europe/Paris', label: 'France métropolitaine (Paris)' },
  { value: 'Europe/Brussels', label: 'Belgique (Bruxelles)' },
  { value: 'Europe/Zurich', label: 'Suisse (Zurich)' },
  { value: 'Europe/London', label: 'Royaume-Uni (Londres)' },
  { value: 'Africa/Conakry', label: 'Guinée (Conakry)' },
  { value: 'Africa/Dakar', label: 'Sénégal (Dakar)' },
  { value: 'Africa/Abidjan', label: "Côte d'Ivoire (Abidjan)" },
  { value: 'Africa/Bamako', label: 'Mali (Bamako)' },
  { value: 'Africa/Casablanca', label: 'Maroc (Casablanca)' },
  { value: 'Africa/Algiers', label: 'Algérie (Alger)' },
  { value: 'Africa/Tunis', label: 'Tunisie (Tunis)' },
  { value: 'Africa/Douala', label: 'Cameroun (Douala)' },
  { value: 'Africa/Kinshasa', label: 'RD Congo (Kinshasa)' },
  { value: 'Indian/Reunion', label: 'La Réunion' },
  { value: 'Indian/Mayotte', label: 'Mayotte' },
  { value: 'America/Guadeloupe', label: 'Guadeloupe' },
  { value: 'America/Martinique', label: 'Martinique' },
  { value: 'America/Cayenne', label: 'Guyane' },
  { value: 'America/Montreal', label: 'Québec (Montréal)' },
  { value: 'UTC', label: 'UTC' },
];

let platformTimezone = DEFAULT_TIMEZONE;

export function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('fr-FR', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function setPlatformTimezone(tz: string) {
  platformTimezone = isValidTimezone(tz) ? tz : DEFAULT_TIMEZONE;
}

export function getPlatformTimezone() {
  return platformTimezone;
}

export interface ZonedParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  weekday: number; // ISO : 1 = lundi … 7 = dimanche
}

const WEEKDAYS: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

// Date / heure "murale" d'un instant dans un fuseau.
export function zonedParts(date: Date, tz = platformTimezone): ZonedParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    weekday: 'short',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '0';
  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    hour: Number(get('hour')) % 24,
    minute: Number(get('minute')),
    weekday: WEEKDAYS[get('weekday')] ?? 1,
  };
}

// Decalage (minutes) du fuseau par rapport a UTC a un instant donne.
function offsetMinutes(date: Date, tz: string) {
  const p = zonedParts(date, tz);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  return Math.round((asUtc - Math.floor(date.getTime() / 60_000) * 60_000) / 60_000);
}

// Instant correspondant a "annee-mois-jour heure:minute" dans le fuseau
// (gere le changement d'heure ; le jour J peut deborder, ex. day = 35).
export function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  tz = platformTimezone,
): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  let result = guess - offsetMinutes(new Date(guess), tz) * 60_000;
  // Second passage : l'offset peut differer de part et d'autre d'un changement d'heure.
  result = guess - offsetMinutes(new Date(result), tz) * 60_000;
  return new Date(result);
}

// Debut du jour (00:00) dans le fuseau, eventuellement decale de N jours.
export function startOfZonedDay(date: Date, addDays = 0, tz = platformTimezone): Date {
  const p = zonedParts(date, tz);
  return zonedTimeToUtc(p.year, p.month, p.day + addDays, 0, 0, tz);
}

// Formatage francais dans le fuseau de la plateforme (emails, messages).
export function formatInPlatformTz(date: Date, options: Intl.DateTimeFormatOptions) {
  return date.toLocaleString('fr-FR', { ...options, timeZone: platformTimezone });
}
