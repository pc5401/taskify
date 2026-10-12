import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AccessTokenService } from './access-token.service';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { PrismaService } from '../persistence/prisma.service';
import { Prisma } from '../../generated/client';

export const ACCESS_SECONDS = 900;
export const SESSION_MILLISECONDS = 7 * 24 * 60 * 60 * 1000;
export interface SessionIdentity { userId: string; sessionId: string }
export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  refreshExpiresAt: string;
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const denied = () => new UnauthorizedException({ code: 'UNAUTHENTICATED', message: 'Authentication required', details: {} });
export const refreshHash = (token: string) => createHash('sha256').update(token).digest('hex');

@Injectable()
export class AuthSessionService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: AccessTokenService) {}

  private bundle(userId: string, sessionId: string, expiresAt: Date, refreshToken: string, now: Date): SessionTokens {
    const iat = Math.floor(now.getTime() / 1000);
    return {
      accessToken: this.jwt.sign({ sub: userId, sid: sessionId, iat, exp: iat + ACCESS_SECONDS }, { algorithm: 'HS256' }),
      refreshToken, tokenType: 'Bearer', expiresIn: ACCESS_SECONDS, refreshExpiresAt: expiresAt.toISOString(),
    };
  }

  // Called only after a future login flow has verified the user's credentials.
  async issueForAuthenticatedUser(userId: string, transaction?: Prisma.TransactionClient): Promise<SessionTokens> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_MILLISECONDS);
    const sessionId = randomUUID();
    const refreshToken = randomBytes(32).toString('base64url');
    const tokens = this.bundle(userId, sessionId, expiresAt, refreshToken, now);
    const persist = async (tx: Prisma.TransactionClient) => {
      await tx.authSession.create({ data: { id: sessionId, userId, createdAt: now, expiresAt } });
      await tx.refreshCredential.create({ data: { sessionId, tokenHash: refreshHash(refreshToken), createdAt: now } });
    };
    if (transaction) await persist(transaction);
    else await this.prisma.$transaction(persist);
    return tokens;
  }

  async refresh(refreshToken: string): Promise<SessionTokens> {
    if (typeof refreshToken !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(refreshToken)) throw denied();
    const tokenHash = refreshHash(refreshToken);
    const result = await this.prisma.$transaction(async tx => {
      const lookup = await tx.refreshCredential.findUnique({ where: { tokenHash } });
      if (!lookup) return null;
      // All refresh/logout mutations lock this session before re-reading state.
      await tx.$queryRaw`SELECT id FROM auth_sessions WHERE id = ${lookup.sessionId}::uuid FOR UPDATE`;
      const credential = await tx.refreshCredential.findUnique({ where: { tokenHash } });
      const session = await tx.authSession.findUnique({ where: { id: lookup.sessionId } });
      const now = new Date();
      if (!session || !credential || session.revokedAt || session.expiresAt <= now) return null;
      if (credential.consumedAt) {
        await tx.authSession.update({ where: { id: session.id }, data: { revokedAt: now } });
        // Return rejection; throwing here would roll back reuse revocation.
        return null;
      }
      const next = randomBytes(32).toString('base64url');
      const tokens = this.bundle(session.userId, session.id, session.expiresAt, next, now);
      await tx.refreshCredential.update({ where: { id: credential.id }, data: { consumedAt: now } });
      await tx.refreshCredential.create({ data: { sessionId: session.id, tokenHash: refreshHash(next), createdAt: now } });
      return tokens;
    });
    if (!result) throw denied();
    return result;
  }

  private decode(accessToken: string): SessionIdentity {
    try {
      const claims = this.jwt.verify(accessToken, { algorithms: ['HS256'] });
      if (!uuid.test(claims.sub) || !uuid.test(claims.sid) ||
          !Number.isInteger(claims.iat) || !Number.isInteger(claims.exp) ||
          claims.exp - claims.iat !== ACCESS_SECONDS) throw denied();
      return { userId: claims.sub, sessionId: claims.sid };
    } catch { throw denied(); }
  }

  async authenticate(accessToken: string): Promise<SessionIdentity> {
    const identity = this.decode(accessToken);
    const session = await this.prisma.authSession.findUnique({ where: { id: identity.sessionId } });
    if (!session || session.userId !== identity.userId || session.revokedAt || session.expiresAt <= new Date()) throw denied();
    return identity;
  }

  async logout(accessToken: string): Promise<void> {
    const identity = this.decode(accessToken);
    const revoked = await this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM auth_sessions WHERE id = ${identity.sessionId}::uuid FOR UPDATE`;
      const session = await tx.authSession.findUnique({ where: { id: identity.sessionId } });
      const now = new Date();
      if (!session || session.userId !== identity.userId || session.revokedAt || session.expiresAt <= now) return false;
      await tx.authSession.update({ where: { id: session.id }, data: { revokedAt: now } });
      return true;
    });
    if (!revoked) throw denied();
  }
}
