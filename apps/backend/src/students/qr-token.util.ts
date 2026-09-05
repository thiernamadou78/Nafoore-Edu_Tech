import { randomBytes } from 'crypto';

export function generateQrToken(): string {
  return randomBytes(24).toString('base64url');
}
