import { BoardReadsService, parseCardRead, publicReadCard } from './board-reads.service';
const boardId = '11111111-1111-4111-8111-111111111111';
const id = '22222222-2222-4222-8222-222222222222';
describe('board read projection and pagination (mock persistence)', () => {
  let db: any; let service: BoardReadsService;
  beforeEach(() => {
    db = { boardMember: { findUnique: jest.fn(async () => ({ role: 'VIEWER' })) }, board: { findUnique: jest.fn() },
      column: { findMany: jest.fn(async () => []) }, card: { findMany: jest.fn(async () => []) } };
    service = new BoardReadsService(db);
  });
  it('rejects missing membership before board/column/card content lookup', async () => {
    db.boardMember.findUnique.mockResolvedValue(null);
    for (const call of [() => service.board(boardId, 'user'), () => service.columns(boardId, 'user'), () => service.cards(boardId, 'user')]) {
      await expect(call()).rejects.toMatchObject({ status: 403, response: { code: 'NOT_MEMBER', details: {} } });
    }
    expect(db.board.findUnique).not.toHaveBeenCalled(); expect(db.column.findMany).not.toHaveBeenCalled(); expect(db.card.findMany).not.toHaveBeenCalled();
  });
  it('permits every membership role and orders/project columns consistently', async () => {
    for (const role of ['OWNER', 'EDITOR', 'VIEWER']) {
      db.boardMember.findUnique.mockResolvedValue({ role });
      expect(await service.columns(boardId, 'user')).toEqual({ items: [] });
    }
    expect(db.column.findMany.mock.calls[0][0].orderBy).toEqual([{ position: 'asc' }, { id: 'asc' }]);
    expect(db.column.findMany.mock.calls[0][0].select.cards).toBeUndefined();
  });
  it('ANDs filters under the board boundary and preserves exact tag case/space', async () => {
    await service.cards(boardId, 'user', { columnId: id, assigneeId: id, tag: ' Alpha ' });
    const call = db.card.findMany.mock.calls[0][0];
    expect(call.where).toEqual({ boardId, columnId: id, assigneeId: id, tags: { some: { tag: { name: ' Alpha ' } } } });
    expect(call.orderBy).toEqual([{ position: 'asc' }, { id: 'asc' }]); expect(call.take).toBe(21);
  });
  it('continues using position/id boundary without looking up the deleted anchor', async () => {
    const filters = { columnId: null, assigneeId: null, tag: null };
    const cursor = Buffer.from(JSON.stringify({ boardId, filters, position: 1024, id })).toString('base64url');
    await service.cards(boardId, 'user', { cursor, limit: '1' });
    expect(db.card.findMany.mock.calls[0][0].where.OR).toEqual([{ position: { gt: 1024 } }, { position: 1024, id: { gt: id } }]);
    expect(db.card.findUnique).toBeUndefined();
    expect(() => parseCardRead(id, { cursor })).toThrow();
    expect(() => parseCardRead(boardId, { cursor, tag: '' })).toThrow();
  });
  it('rejects malformed IDs, repeated scalar fields and malformed cursor payloads', async () => {
    await expect(service.columns('invalid', 'user')).rejects.toMatchObject({ status: 422 });
    for (const query of [{ columnId: 'bad' }, { assigneeId: [id, id] }, { tag: ['a', 'b'] }, { limit: ['1', '2'] }, { cursor: 'broken' }]) {
      expect(() => parseCardRead(boardId, query)).toThrow();
    }
    const cursor = Buffer.from(JSON.stringify({ boardId, filters: { columnId: null, assigneeId: null, tag: null }, position: 2147483648, id })).toString('base64url');
    expect(() => parseCardRead(boardId, { cursor })).toThrow();
    expect(parseCardRead(boardId, { tag: '', unknown: true }).filters.tag).toBe('');
  });
  it('computes blocked from direct predecessor and warns only blocked done cards', () => {
    const base = { id, tags: [{ tag: { name: 'Alpha' } }], column: { isDone: false }, creatorId: 'secret-internal' };
    expect(publicReadCard({ ...base, predecessor: null }).blocked).toBe(false);
    const blocked = { ...base, predecessor: { column: { isDone: false } } };
    expect(publicReadCard(blocked).blocked).toBe(true); expect(publicReadCard(blocked).warnings).toEqual([]);
    expect(publicReadCard({ ...blocked, column: { isDone: true } }).warnings).toEqual(['BLOCKED_BY_PREDECESSOR']);
    expect(publicReadCard({ ...base, predecessor: { column: { isDone: true } } }).blocked).toBe(false);
    expect(publicReadCard(blocked).tagNames).toEqual(['Alpha']); expect(Object.keys(publicReadCard(blocked))).not.toContain('creatorId');
  });
});
