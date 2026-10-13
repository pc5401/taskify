import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../app.module';
import { PrismaService } from '../persistence/prisma.service';
import { AuthSessionService } from '../auth/auth-session.service';
import { fail } from '../common/if-match';

describe('board read HTTP routes (mock DB/session; real Nest guard and query parsing)', () => {
  const boardId = '11111111-1111-4111-8111-111111111111';
  const id = '22222222-2222-4222-8222-222222222222';
  let app: INestApplication; let db: any;
  const board = { id: boardId, title: 'Private board', description: null, color: '#5534DA', version: 3, createdAt: new Date(), updatedAt: new Date() };
  beforeAll(async () => {
    process.env.AUTH_JWT_SECRET = 'test-only-secret-for-board-reads-32-bytes';
    db = { $disconnect: jest.fn(), boardMember: { findMany: jest.fn(async () => [{ userId: id, role: 'EDITOR', joinedAt: new Date('2026-10-13T00:00:00Z'), user: { nickname: 'Member', email: 'private', passwordHash: 'private', sessions: ['private'] } }]), findUnique: jest.fn(async ({ where }) => where.boardId_userId.boardId === boardId ? { role: 'VIEWER' } : null) },
      board: { findUnique: jest.fn(async () => board) }, column: { findMany: jest.fn(async () => []) }, card: { findMany: jest.fn(async () => []) } };
    const sessions = { authenticate: jest.fn(async token => {
      if (!['OWNER', 'EDITOR', 'VIEWER'].includes(token)) fail(401, 'UNAUTHENTICATED');
      return { userId: token, sessionId: 'session' };
    }) };
    const module = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(PrismaService).useValue(db).overrideProvider(AuthSessionService).useValue(sessions).compile();
    app = module.createNestApplication(); app.setGlobalPrefix('v1'); await app.init();
  });
  afterAll(async () => { await app?.close(); delete process.env.AUTH_JWT_SECRET; });
  it('allows each role to read all three routes and emits Board version ETag', async () => {
    for (const role of ['OWNER', 'EDITOR', 'VIEWER']) {
      const response = await request(app.getHttpServer()).get(`/v1/boards/${boardId}`).set('Authorization', `Bearer ${role}`).expect(200);
      expect(response.headers.etag).toBe('"3"'); expect(response.body.myRole).toBeUndefined();
      await request(app.getHttpServer()).get(`/v1/boards/${boardId}/columns`).set('Authorization', `Bearer ${role}`).expect(200).expect({ items: [] });
      await request(app.getHttpServer()).get(`/v1/boards/${boardId}/cards`).set('Authorization', `Bearer ${role}`).expect(200).expect({ items: [], nextCursor: null });
    }
  });
  it('all roles read only public member fields in deterministic order', async () => {
    for (const role of ['OWNER', 'EDITOR', 'VIEWER']) {
      const members = await request(app.getHttpServer()).get(`/v1/boards/${boardId}/members`).set('Authorization', `Bearer ${role}`).expect(200);
      expect(members.body).toEqual({ items: [{ userId: id, nickname: 'Member', role: 'EDITOR', joinedAt: '2026-10-13T00:00:00.000Z' }] });
      expect(db.boardMember.findMany).toHaveBeenLastCalledWith({ where: { boardId }, orderBy: [{ joinedAt: 'asc' }, { userId: 'asc' }], select: { userId: true, role: true, joinedAt: true, user: { select: { nickname: true } } } });
    }
  });
  it('enforces session and missing/nonmember boundary on each route', async () => {
    for (const suffix of ['', '/columns', '/cards', '/members']) {
      await request(app.getHttpServer()).get(`/v1/boards/${boardId}${suffix}`).expect(401);
      await request(app.getHttpServer()).get(`/v1/boards/${boardId}${suffix}`).set('Authorization', 'Bearer revoked').expect(401);
      const response = await request(app.getHttpServer()).get(`/v1/boards/${id}${suffix}`).set('Authorization', 'Bearer VIEWER').expect(403);
      expect(response.body).toEqual({ code: 'NOT_MEMBER', message: 'NOT_MEMBER', details: {} });
      expect(JSON.stringify(response.body)).not.toContain(board.title);
    }
  });
  it('rejects malformed board/query inputs with 422 envelope and leaves read state unchanged', async () => {
    for (const suffix of ['', '/columns', '/cards', '/members']) {
      await request(app.getHttpServer()).get(`/v1/boards/bad${suffix}`).set('Authorization', 'Bearer VIEWER').expect(422);
    }
    for (const query of ['limit=1&limit=2', 'tag=a&tag=b', 'columnId=bad', 'assigneeId=bad', 'cursor=broken']) {
      await request(app.getHttpServer()).get(`/v1/boards/${boardId}/cards?${query}`).set('Authorization', 'Bearer VIEWER').expect(422).expect(r => expect(r.body.details).toEqual({}));
    }
    expect(board.version).toBe(3);
  });
});
