import { AccessTokenService } from './access-token.service';
import { AuthSessionService, refreshHash, SESSION_MILLISECONDS } from './auth-session.service';
import { SessionGuard } from './session.guard';

describe('auth session foundation (mock persistence, no DB concurrency proof)', () => {
  const userId = '11111111-1111-4111-8111-111111111111';
  const sessionId = '22222222-2222-4222-8222-222222222222';
  const jwt = new AccessTokenService('test-secret-with-at-least-32-bytes-long');
  const raw = 'A'.repeat(43);
  let session: any; let credential: any; let tx: any; let service: AuthSessionService;
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-12T00:00:00Z'));
    session = { id: sessionId, userId, createdAt: new Date(), expiresAt: new Date(Date.now() + SESSION_MILLISECONDS), revokedAt: null };
    credential = { id: 'credential', sessionId, tokenHash: refreshHash(raw), consumedAt: null };
    tx = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: sessionId }]),
      authSession: { create: jest.fn(), findUnique: jest.fn(async () => session), update: jest.fn(async ({ data }) => Object.assign(session, data)) },
      refreshCredential: { findUnique: jest.fn(async () => credential), create: jest.fn(), update: jest.fn(async ({ data }) => Object.assign(credential, data)) },
    };
    const prisma: any = { ...tx, $transaction: jest.fn(async work => work(tx)) };
    service = new AuthSessionService(prisma, jwt);
  });
  afterEach(() => jest.useRealTimers());
  const access = () => jwt.sign({ sub: userId, sid: sessionId, iat: Math.floor(Date.now()/1000), exp: Math.floor(Date.now()/1000)+900 });
  it('issues 15-minute signed sid JWT, absolute seven-day session, and hash only', async () => {
    const tokens = await service.issueForAuthenticatedUser(userId);
    const payload = jwt.verify(tokens.accessToken);
    expect(payload.exp - payload.iat).toBe(900);
    expect(payload.sid).toBe(tx.authSession.create.mock.calls[0][0].data.id);
    expect(new Date(tokens.refreshExpiresAt).getTime() - Date.now()).toBe(SESSION_MILLISECONDS);
    expect(tx.refreshCredential.create.mock.calls[0][0].data.tokenHash).toBe(refreshHash(tokens.refreshToken));
    expect(JSON.stringify(tx.refreshCredential.create.mock.calls)).not.toContain(tokens.refreshToken);
  });
  it('locks then re-reads, consumes old credential, keeps history and absolute expiry', async () => {
    jest.setSystemTime(new Date(session.createdAt.getTime()+6*86400000));
    const result = await service.refresh(raw);
    expect(result.refreshToken).not.toBe(raw);
    expect(result.refreshExpiresAt).toBe(session.expiresAt.toISOString());
    expect(credential.consumedAt).toEqual(new Date());
    expect(tx.refreshCredential.findUnique).toHaveBeenCalledTimes(2);
    expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(tx.refreshCredential.findUnique.mock.invocationCallOrder[1]);
    expect(tx.refreshCredential.create.mock.calls[0][0].data.tokenHash).toBe(refreshHash(result.refreshToken));
  });
  it('commits reuse revocation then rejects and immediately rejects existing access', async () => {
    const token = access();
    await service.refresh(raw);
    await expect(service.refresh(raw)).rejects.toMatchObject({ status: 401, response: { code: 'UNAUTHENTICATED', message: 'Authentication required', details: {} } });
    expect(session.revokedAt).toEqual(new Date());
    expect(tx.authSession.update).toHaveBeenCalledWith({ where: { id: sessionId }, data: { revokedAt: new Date() } });
    await expect(service.authenticate(token)).rejects.toMatchObject({ status: 401 });
    expect(tx.refreshCredential.create).toHaveBeenCalledTimes(1);
  });
  it('logout targets only current session and old access is rejected', async () => {
    const token = access();
    await service.logout(token);
    expect(tx.authSession.update.mock.calls[0][0].where).toEqual({ id: sessionId });
    await expect(service.authenticate(token)).rejects.toMatchObject({ status: 401 });
  });
  it('rejects refresh/access at absolute deadline without extending or rotating', async () => {
    jest.setSystemTime(session.expiresAt);
    await expect(service.refresh(raw)).rejects.toMatchObject({ status: 401 });
    await expect(service.authenticate(access())).rejects.toMatchObject({ status: 401 });
    expect(tx.refreshCredential.update).not.toHaveBeenCalled();
  });
  it('rejects invalid, expired, mismatched-user JWT and unknown refresh', async () => {
    await expect(service.authenticate('broken')).rejects.toMatchObject({ status: 401 });
    const token = access();
    jest.setSystemTime(new Date(Date.now()+900000));
    await expect(service.authenticate(token)).rejects.toMatchObject({ status: 401 });
    session.userId = 'other';
    await expect(service.authenticate(access())).rejects.toMatchObject({ status: 401 });
    tx.refreshCredential.findUnique.mockResolvedValue(null);
    await expect(service.refresh(raw)).rejects.toMatchObject({ status: 401 });
    expect(tx.authSession.update).not.toHaveBeenCalled();
  });
  it('guard checks session on every request and propagates revoked rejection', async () => {
    const guard = new SessionGuard(service);
    const request: any = { headers: { authorization: `Bearer ${access()}` } };
    const context: any = { switchToHttp: () => ({ getRequest: () => request }) };
    expect(await guard.canActivate(context)).toBe(true);
    expect(request.auth).toEqual({ userId, sessionId });
    session.revokedAt = new Date();
    await expect(guard.canActivate(context)).rejects.toMatchObject({ status: 401 });
  });
});
