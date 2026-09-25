import { BadRequestException, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  DEFAULT_TIMEZONE,
  getPlatformTimezone,
  isValidTimezone,
  setPlatformTimezone,
  TIMEZONE_OPTIONS,
} from '../common/timezone';

const SETTING_KEY = 'platformTimezone';
const REFRESH_INTERVAL_MS = 60_000;

// Charge et enregistre le fuseau de la plateforme (table site_settings) et
// tient a jour la valeur en memoire utilisee partout (common/timezone.ts).
@Injectable()
export class PlatformTimezoneService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PlatformTimezoneService.name);
  private timer?: NodeJS.Timeout;

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.refresh();
    this.timer = setInterval(() => {
      this.refresh().catch((error) => this.logger.warn(`Lecture du fuseau horaire échouée : ${error}`));
    }, REFRESH_INTERVAL_MS);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async refresh() {
    const setting = await this.prisma.siteSetting.findUnique({ where: { key: SETTING_KEY } });
    setPlatformTimezone(setting?.value ?? DEFAULT_TIMEZONE);
  }

  get() {
    return {
      timezone: getPlatformTimezone(),
      options: TIMEZONE_OPTIONS,
      serverTime: new Date().toISOString(),
    };
  }

  async set(timezone: string) {
    if (!isValidTimezone(timezone)) {
      throw new BadRequestException('Fuseau horaire inconnu');
    }
    await this.prisma.siteSetting.upsert({
      where: { key: SETTING_KEY },
      create: { key: SETTING_KEY, value: timezone },
      update: { value: timezone },
    });
    setPlatformTimezone(timezone);
    return this.get();
  }
}
