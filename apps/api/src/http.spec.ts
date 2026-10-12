import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './app.module';
import { PrismaService } from './persistence/prisma.service';

describe('auth/me/boards HTTP with mock persistence (no PostgreSQL)', () => {
  let app: INestApplication; let db: any;
  const users = new Map<string, any>(); const sessions = new Map<string, any>(); const credentials = new Map<string, any>();
  const now = new Date();
  const userId = '11111111-1111-4111-8111-111111111111';
  const boardId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  beforeAll(async () => {
    process.env.AUTH_JWT_SECRET = 'test-only-random-secret-at-least-32-bytes';
    db = {
      $disconnect: jest.fn(), $queryRaw: jest.fn(async () => []),
      user: {
        create: jest.fn(async ({ data }) => {
          if ([...users.values()].some(u => u.email === data.email)) throw { code: 'P2002' };
          const user = { ...data, id: users.size ? '22222222-2222-4222-8222-222222222222' : userId, avatarUrl: null, createdAt: now };
          users.set(user.id, user); return user;
        }),
        findUnique: jest.fn(async ({ where }) => where.id ? users.get(where.id) : [...users.values()].find(u => u.email === where.email)),
      },
      authSession: {
        create: jest.fn(async ({ data }) => { sessions.set(data.id, { ...data, revokedAt: null }); }),
        findUnique: jest.fn(async ({ where }) => sessions.get(where.id)),
        update: jest.fn(async ({ where, data }) => Object.assign(sessions.get(where.id), data)),
      },
      refreshCredential: {
        create: jest.fn(async ({ data }) => { credentials.set(data.tokenHash, { ...data, id: data.tokenHash, consumedAt: null }); }),
        findUnique: jest.fn(async ({ where }) => credentials.get(where.tokenHash)),
        update: jest.fn(async ({ where, data }) => Object.assign(credentials.get(where.id), data)),
      },
      board: { create: jest.fn(async ({ data }) => ({ ...data, id: boardId, version: 1, createdAt: now, updatedAt: now, description: data.description ?? null })) },
      boardMember: { create: jest.fn(), findMany: jest.fn(async () => []) }, column: { createMany: jest.fn() },
    };
    db.$transaction = jest.fn(async work => work(db));
    const module = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(PrismaService).useValue(db).compile();
    app = module.createNestApplication(); app.setGlobalPrefix('v1'); await app.init();
  });
  afterAll(async () => { await app?.close(); delete process.env.AUTH_JWT_SECRET; });
  let first: any; let second: any;
  it('register enforces existing DTO boundaries and returns only public fields', async () => {
    for (const body of [ {}, { email: 'bad', password: '12345678', nickname: 'QA' },
      { email: 'a@example.test', password: '1234567', nickname: 'QA' },
      { email: 'a@example.test', password: '12345678', nickname: '' },
      { email: 'a@example.test', password: '12345678', nickname: 'x'.repeat(31) } ]) {
      const response = await request(app.getHttpServer()).post('/v1/auth/register').send(body).expect(422);
      expect(response.body).toEqual({ code: 'INVALID_INPUT', message: 'INVALID_INPUT', details: {} });
    }
    expect(users.size).toBe(0);
    first = (await request(app.getHttpServer()).post('/v1/auth/register').send({ email: 'Case@example.test', password: '12345678', nickname: 'Q', unknown: true }).expect(201)).body;
    expect(Object.keys(first).sort()).toEqual(['accessToken', 'refreshToken', 'user']);
    expect(Object.keys(first.user).sort()).toEqual(['avatarUrl', 'createdAt', 'email', 'id', 'nickname']);
    expect([...users.values()][0].passwordHash).toMatch(/^scrypt-v1\$/);
    await request(app.getHttpServer()).post('/v1/auth/register').send({ email: 'Case@example.test', password: '12345678', nickname: 'Q' }).expect(409).expect(r => expect(r.body.code).toBe('EMAIL_TAKEN'));
  });
  it('login compares exact email and shares generic error for unknown/wrong credentials', async () => {
    for (const input of [{ email: 'case@example.test', password: '12345678' }, { email: 'Case@example.test', password: 'wrong' }]) {
      await request(app.getHttpServer()).post('/v1/auth/login').send(input).expect(401).expect(r => expect(r.body.code).toBe('INVALID_CREDENTIALS'));
    }
    await request(app.getHttpServer()).post('/v1/auth/login').send({ email: ' Case@example.test ', password: '12345678' }).expect(422);
    second = (await request(app.getHttpServer()).post('/v1/auth/login').send({ email: 'Case@example.test', password: '12345678' }).expect(200)).body;
    await request(app.getHttpServer()).post('/v1/auth/register').send({ email: 'case@example.test', password: '12345678', nickname: 'x'.repeat(30) }).expect(201);
  });
  it('GET me uses authenticated identity and excludes secrets', async () => {
    const response = await request(app.getHttpServer()).get('/v1/me?userId=other').set('Authorization', `Bearer ${first.accessToken}`).expect(200);
    expect(response.body).toEqual(first.user);
    expect(response.body.passwordHash).toBeUndefined();
    await request(app.getHttpServer()).get('/v1/me').expect(401);
    await request(app.getHttpServer()).get('/v1/boards').set('Authorization', 'Bearer broken').expect(401);
    await request(app.getHttpServer()).post('/v1/boards').send({ title: 'x' }).expect(401);
  });
  it('refresh returns user and reuse revokes existing access while other login remains live', async () => {
    await request(app.getHttpServer()).post('/v1/auth/refresh').send({ refreshToken: 3 }).expect(422);
    const rotated = (await request(app.getHttpServer()).post('/v1/auth/refresh').send({ refreshToken: first.refreshToken }).expect(200)).body;
    expect(Object.keys(rotated).sort()).toEqual(['accessToken', 'refreshToken', 'user']);
    expect(rotated.user).toEqual(first.user);
    await request(app.getHttpServer()).post('/v1/auth/refresh').send({ refreshToken: first.refreshToken }).expect(401);
    await request(app.getHttpServer()).get('/v1/me').set('Authorization', `Bearer ${rotated.accessToken}`).expect(401);
    await request(app.getHttpServer()).get('/v1/me').set('Authorization', `Bearer ${second.accessToken}`).expect(200);
  });
  it('GET boards maps role, default limit and stored keyset boundary without lookup', async () => {
    const board = { id: boardId, title: 'x', description: null, color: '#5534DA', version: 1, createdAt: now, updatedAt: now };
    db.boardMember.findMany.mockResolvedValueOnce([{ boardId, joinedAt: now, role: 'VIEWER', board }, { boardId, joinedAt: now, role: 'OWNER', board }]);
    const page = (await request(app.getHttpServer()).get('/v1/boards?limit=1').set('Authorization', `Bearer ${second.accessToken}`).expect(200)).body;
    expect(page.items[0].myRole).toBe('VIEWER');
    expect(page.items[0].joinedAt).toBeUndefined();
    await request(app.getHttpServer()).get('/v1/boards').query({ cursor: page.nextCursor }).set('Authorization', `Bearer ${second.accessToken}`).expect(200).expect(r => expect(r.body.nextCursor).toBeNull());
    const query = db.boardMember.findMany.mock.calls.at(-1)[0];
    expect(query.where.userId).toBe(userId);
    expect(query.where.OR).toEqual([{ joinedAt: { lt: now } }, { joinedAt: now, boardId: { lt: boardId } }]);
    expect(query.orderBy).toEqual([{ joinedAt: 'desc' }, { boardId: 'desc' }]);
    expect(query.take).toBe(21);
    for (const suffix of ['?cursor=broken', '?limit=0', '?limit=101', '?limit=1.5']) {
      await request(app.getHttpServer()).get(`/v1/boards${suffix}`).set('Authorization', `Bearer ${second.accessToken}`).expect(422);
    }
  });
  it('POST boards returns Board+ETag and creates OWNER plus three defaults in same transaction', async () => {
    const result = await request(app.getHttpServer()).post('/v1/boards').set('Authorization', `Bearer ${second.accessToken}`).send({ title: 'Board' }).expect(201);
    expect(result.headers.etag).toBe('"1"'); expect(result.body.color).toBe('#5534DA'); expect(result.body.myRole).toBeUndefined();
    expect(db.boardMember.create).toHaveBeenCalledWith({ data: { boardId, userId, role: 'OWNER' } });
    expect(db.column.createMany).toHaveBeenCalledWith({ data: [
      { boardId, title: '할 일', position: 0, isDone: false }, { boardId, title: '하는 중', position: 1024, isDone: false }, { boardId, title: '완료', position: 2048, isDone: true },
    ] });
    await request(app.getHttpServer()).post('/v1/boards').set('Authorization', `Bearer ${second.accessToken}`).send({ title: 'x'.repeat(80), description: 'x'.repeat(500), color: 'anything' }).expect(201).expect(r => expect(r.body.color).toBe('anything'));
    for (const input of [{}, { title: '' }, { title: 'x'.repeat(81) }, { title: 'x', description: 'x'.repeat(501) }, { title: 'x', color: null }]) {
      await request(app.getHttpServer()).post('/v1/boards').set('Authorization', `Bearer ${second.accessToken}`).send(input).expect(422);
    }
  });
  it('logout sends empty 204, immediately blocks all protected paths and refresh', async () => {
    const result = await request(app.getHttpServer()).post('/v1/auth/logout').set('Authorization', `Bearer ${second.accessToken}`).expect(204);
    expect(result.text).toBe('');
    for (const path of ['/v1/me', '/v1/boards']) await request(app.getHttpServer()).get(path).set('Authorization', `Bearer ${second.accessToken}`).expect(401);
    await request(app.getHttpServer()).post('/v1/boards').set('Authorization', `Bearer ${second.accessToken}`).send({ title: 'x' }).expect(401);
    await request(app.getHttpServer()).post('/v1/auth/refresh').send({ refreshToken: second.refreshToken }).expect(401);
  });
});
