import { randomBytes } from 'crypto';

export function generateCompletionToken(): string {
  return randomBytes(24).toString('base64url');
}
