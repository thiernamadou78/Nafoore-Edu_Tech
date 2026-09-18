import { Injectable, Logger } from '@nestjs/common';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
// Politique d'usage Nominatim (gratuit) : max 1 requête/seconde, User-Agent
// identifiable obligatoire. https://operations.osmfoundation.org/policies/nominatim/
const MIN_INTERVAL_MS = 1100;

@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name);
  private lastRequestAt = 0;

  // Best-effort : ne lève jamais — un échec de géocodage ne doit jamais
  // bloquer la création/mise à jour d'une famille ou d'un enseignant, le pin
  // sur la carte admin sera juste absent tant que l'adresse n'est pas géocodée.
  // Le code postal, quand il est fourni, desambiguise nettement le resultat
  // (ex: rues homonymes dans plusieurs communes).
  async geocode(address: string, postalCode?: string | null): Promise<Coordinates | null> {
    const query = [address?.trim(), postalCode?.trim()].filter(Boolean).join(', ');
    if (!query) return null;

    await this.throttle();

    try {
      const url = new URL(NOMINATIM_URL);
      url.searchParams.set('q', query);
      url.searchParams.set('format', 'json');
      url.searchParams.set('limit', '1');
      url.searchParams.set('countrycodes', 'fr');

      const response = await fetch(url, {
        headers: { 'User-Agent': 'NafooreEducation/1.0 (contact@nafoore.fr)' },
      });
      if (!response.ok) {
        this.logger.warn(`Géocodage échoué (HTTP ${response.status}) pour "${query}"`);
        return null;
      }

      const results = (await response.json()) as Array<{ lat: string; lon: string }>;
      if (!results.length) return null;

      const latitude = Number.parseFloat(results[0].lat);
      const longitude = Number.parseFloat(results[0].lon);
      if (Number.isNaN(latitude) || Number.isNaN(longitude)) return null;

      return { latitude, longitude };
    } catch (error) {
      this.logger.warn(
        `Échec de géocodage pour "${query}": ${error instanceof Error ? error.message : error}`,
      );
      return null;
    }
  }

  private readonly cityCache = new Map<string, string>();

  // Ville d'un code postal (API publique geo.api.gouv.fr), en cache memoire.
  // Best-effort : renvoie null en cas d'echec, la carte affichera alors le
  // code postal seul.
  async cityForPostalCode(postalCode?: string | null): Promise<string | null> {
    const code = postalCode?.trim();
    if (!code || !/^\d{5}$/.test(code)) return null;
    const cached = this.cityCache.get(code);
    if (cached) return cached;
    try {
      const response = await fetch(
        `https://geo.api.gouv.fr/communes?codePostal=${code}&fields=nom&format=json`,
      );
      if (!response.ok) return null;
      const communes = (await response.json()) as Array<{ nom: string }>;
      const city = communes[0]?.nom ?? null;
      if (city) this.cityCache.set(code, city);
      return city;
    } catch {
      return null;
    }
  }

  private async throttle() {
    const elapsed = Date.now() - this.lastRequestAt;
    if (elapsed < MIN_INTERVAL_MS) {
      await new Promise((resolve) => setTimeout(resolve, MIN_INTERVAL_MS - elapsed));
    }
    this.lastRequestAt = Date.now();
  }
}
