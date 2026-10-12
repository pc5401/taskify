import { Injectable } from '@nestjs/common';
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

// Node's maintained scrypt implementation avoids bcrypt's 72-byte truncation.
// Salt per credential; explicit version/work parameters allow future migration.
const derive = (password: string, salt: Buffer): Promise<Buffer> => new Promise((resolve, reject) => {
  scrypt(password, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (error, key) => error ? reject(error) : resolve(key));
});
@Injectable()
export class PasswordService {
  async hash(password: string): Promise<string> {
    const salt = randomBytes(16);
    return `scrypt-v1$${salt.toString('hex')}$${(await derive(password, salt)).toString('hex')}`;
  }
  async verify(password: string, stored: string): Promise<boolean> {
    const fields = /^scrypt-v1\$([a-f0-9]{32})\$([a-f0-9]{128})$/.exec(stored);
    if (!fields) return false;
    return timingSafeEqual(await derive(password, Buffer.from(fields[1], 'hex')), Buffer.from(fields[2], 'hex'));
  }
}
