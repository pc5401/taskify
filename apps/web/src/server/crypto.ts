import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
export type Tokens = { accessToken: string; refreshToken: string };
export function encryptionKey(value: string | undefined): Buffer {
  if (!value || !/^[A-Za-z0-9+/]{43}=$/.test(value)) throw new Error('TASKIFY_SESSION_KEY must encode 32 bytes');
  const key = Buffer.from(value, 'base64');
  if (key.length !== 32) throw new Error('Invalid session key');
  return key;
}
export function opaqueSession(): string { return randomBytes(32).toString('hex'); }
export function sessionHash(value: string): string { return createHash('sha256').update(value).digest('hex'); }
export function encrypt(tokens: Tokens, key: Buffer, hash: string): string {
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(hash));
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(tokens), 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), ciphertext].map(x => x.toString('base64')).join('.');
}
export function decrypt(value: string, key: Buffer, hash: string): Tokens {
  const parts = value.split('.');
  if (parts.length !== 3) throw new Error('Invalid encrypted tokens');
  if (parts.some(part => Buffer.from(part, 'base64').toString('base64') !== part)) throw new Error('Noncanonical ciphertext');
  const [iv, tag, ciphertext] = parts.map(x => Buffer.from(x, 'base64'));
  const cipher = createDecipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(hash)); cipher.setAuthTag(tag);
  const tokens = JSON.parse(Buffer.concat([cipher.update(ciphertext), cipher.final()]).toString('utf8'));
  if (typeof tokens.accessToken !== 'string' || typeof tokens.refreshToken !== 'string') throw new Error('Invalid tokens');
  return tokens;
}
// Only used for a conservative deadline, never as authentication/signature validation.
export function loginDeadline(token: string, now: number): number {
  const payload = JSON.parse(Buffer.from(token.split('.')[1] ?? '', 'base64url').toString('utf8'));
  if (!Number.isSafeInteger(payload.iat) || payload.iat <= 0 || payload.iat * 1000 > now + 60000) throw new Error('Invalid issued time');
  const deadline = Math.min(now, payload.iat * 1000) + 7 * 86400000;
  if (deadline <= now) throw new Error('Expired login');
  return deadline;
}
