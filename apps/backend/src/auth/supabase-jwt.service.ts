import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify } from 'jose';

export interface VerifiedSupabaseUser {
  id: string;
  email?: string;
}

// Vérification locale du JWT via le JWKS public du projet (clé asymétrique ES256) —
// évite l'appel réseau à Supabase Auth (`auth.getUser()`) sur chaque requête protégée.
// `createRemoteJWKSet` met en cache la clé publique en mémoire, un seul fetch au démarrage.
@Injectable()
export class SupabaseJwtService {
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;
  private readonly issuer: string;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL est requis');
    }
    this.issuer = `${supabaseUrl}/auth/v1`;
    this.jwks = createRemoteJWKSet(
      new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`),
    );
  }

  async verify(token: string): Promise<VerifiedSupabaseUser> {
    try {
      const { payload } = await jwtVerify(token, this.jwks, {
        issuer: this.issuer,
        audience: 'authenticated',
      });
      if (!payload.sub) {
        throw new Error('Token sans sub');
      }
      return { id: payload.sub, email: payload.email as string | undefined };
    } catch {
      throw new UnauthorizedException('Token invalide');
    }
  }
}
