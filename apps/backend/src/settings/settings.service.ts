import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Cles exposees publiquement sur la vitrine (whitelist volontaire : un futur
// reglage sensible ajoute a la table ne doit pas fuiter sans etre explicite ici).
const PUBLIC_KEYS = ['hourlyRateFrom', 'statsStudents', 'statsSatisfaction', 'statsTeachers'] as const;

// Valeurs par defaut tant que l'admin n'a rien enregistre.
const DEFAULTS: Record<string, string> = {
  hourlyRateFrom: '25',
  statsStudents: '500+',
  statsSatisfaction: '98%',
  statsTeachers: '50+',
};

// Chiffres-cles de la vitrine : affiches en gros, donc valeur courte (ex: "500+").
const STAT_KEYS = ['statsStudents', 'statsSatisfaction', 'statsTeachers'];
const STAT_MAX_LENGTH = 12;

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getPublicSettings() {
    const settings = await this.prisma.siteSetting.findMany({
      where: { key: { in: [...PUBLIC_KEYS] } },
    });
    const byKey = Object.fromEntries(settings.map((s) => [s.key, s.value]));
    return Object.fromEntries(
      PUBLIC_KEYS.map((key) => [key, byKey[key] ?? DEFAULTS[key]]),
    );
  }

  async getAllSettings() {
    const settings = await this.prisma.siteSetting.findMany();
    const byKey = Object.fromEntries(settings.map((s) => [s.key, s.value]));
    return Object.fromEntries(
      Object.keys(DEFAULTS).map((key) => [key, byKey[key] ?? DEFAULTS[key]]),
    );
  }

  upsert(key: string, value: string) {
    if (!(key in DEFAULTS)) {
      throw new BadRequestException('Réglage inconnu');
    }
    const trimmed = value.trim();
    if (STAT_KEYS.includes(key) && (trimmed.length === 0 || trimmed.length > STAT_MAX_LENGTH)) {
      throw new BadRequestException(
        `La valeur doit faire entre 1 et ${STAT_MAX_LENGTH} caractères (ex : 500+)`,
      );
    }
    return this.prisma.siteSetting.upsert({
      where: { key },
      create: { key, value: trimmed },
      update: { value: trimmed },
    });
  }
}
