import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Cles exposees publiquement sur la vitrine (whitelist volontaire : un futur
// reglage sensible ajoute a la table ne doit pas fuiter sans etre explicite ici).
const PUBLIC_KEYS = ['hourlyRateFrom'] as const;

// Valeurs par defaut tant que l'admin n'a rien enregistre.
const DEFAULTS: Record<string, string> = {
  hourlyRateFrom: '25',
};

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
    return this.prisma.siteSetting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  }
}
