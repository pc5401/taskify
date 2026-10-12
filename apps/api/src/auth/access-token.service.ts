import { Injectable } from '@nestjs/common';
// The existing @nestjs/jwt 12 dependency is ESM; Nest 10 compiles to CommonJS.
// Use its existing CommonJS JWT implementation without installing dependencies.
const jwt = require('jsonwebtoken');

@Injectable()
export class AccessTokenService {
  constructor(private readonly secret: string) {}
  sign(payload: object, _options?: unknown): string {
    return jwt.sign(payload, this.secret, { algorithm: 'HS256' });
  }
  verify(token: string, _options?: unknown): any {
    return jwt.verify(token, this.secret, { algorithms: ['HS256'] });
  }
}
