import { randomBytes, randomInt } from 'crypto';

const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWER = 'abcdefghijkmnpqrstuvwxyz';
const DIGITS = '23456789';
const SYMBOLS = '!@#$%&*-_+=';
const ALL = UPPER + LOWER + DIGITS + SYMBOLS;
const LENGTH = 12;

function pickRandom(charset: string): string {
  const index = randomBytes(1)[0] % charset.length;
  return charset[index];
}

/**
 * Mot de passe temporaire ≥12 caractères garantissant au moins un caractère
 * de chaque classe (majuscule/minuscule/chiffre/symbole), puis mélangé
 * (Fisher-Yates via crypto.randomInt) pour éviter un pattern prévisible en tête.
 */
export function generateTemporaryPassword(): string {
  const required = [
    pickRandom(UPPER),
    pickRandom(LOWER),
    pickRandom(DIGITS),
    pickRandom(SYMBOLS),
  ];
  const rest = Array.from({ length: LENGTH - required.length }, () =>
    pickRandom(ALL),
  );
  const chars = [...required, ...rest];

  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
}
