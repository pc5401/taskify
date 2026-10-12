import { HttpException } from '@nestjs/common';
import { Prisma, Role } from '../../generated/client';
import { TransactionsService } from './transactions.service';

describe('transaction foundations (mock DB; not a concurrency proof)', () => {
  let tx: any;
  let service: TransactionsService;
  beforeEach(() => {
    tx = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: 'board' }]),
      $executeRaw: jest.fn().mockResolvedValue(0),
      boardMember: {
        findUnique: jest.fn().mockResolvedValue({ role: Role.OWNER }),
        count: jest.fn().mockResolvedValue(1),
        update: jest.fn(),
      },
      board: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({ version: 1 }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      card: {
        findUnique: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn(),
      },
      activity: { create: jest.fn() },
    };
    const prisma: any = { $transaction: jest.fn(async (work) => work(tx)) };
    service = new TransactionsService(prisma);
  });
  async function rejected(work: Promise<unknown>, status: number, code: string) {
    await expect(work).rejects.toBeInstanceOf(HttpException);
    await expect(work).rejects.toMatchObject({ response: { code }, status });
    expect(tx.card.updateMany).not.toHaveBeenCalled();
    expect(tx.boardMember.update).not.toHaveBeenCalled();
    expect(tx.activity.create).not.toHaveBeenCalled();
  }
  it('does not enter a transaction without If-Match', async () => {
    await rejected(service.setDependency('board', 'a', 'b', 'actor'), 428, 'IF_MATCH_REQUIRED');
    expect(tx.$queryRaw).not.toHaveBeenCalled();
  });
  it('locks the board before reading membership or the dependency chain', async () => {
    tx.card.findUnique.mockResolvedValueOnce({
      id: 'a', boardId: 'board', version: 1,
    }).mockResolvedValueOnce({ id: 'b', boardId: 'board', predecessorId: null });
    await service.setDependency('board', 'a', 'b', 'actor', '"1"');
    expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      tx.boardMember.findUnique.mock.invocationCallOrder[0],
    );
    expect(tx.card.updateMany).toHaveBeenCalledWith({
      where: { id: 'a', boardId: 'board', version: 1 },
      data: { predecessorId: 'b', version: { increment: 1 } },
    });
    expect(tx.activity.create).toHaveBeenCalled();
  });
  it('rejects cross-board predecessors without mutations', async () => {
    tx.card.findUnique.mockResolvedValueOnce({ boardId: 'board', version: 1 })
      .mockResolvedValueOnce({ boardId: 'other', predecessorId: null });
    await rejected(service.setDependency('board', 'a', 'b', 'actor', '"1"'), 422, 'CROSS_BOARD');
  });
  it('rejects a cycle without mutations', async () => {
    tx.card.findUnique.mockResolvedValueOnce({ boardId: 'board', version: 1 })
      .mockResolvedValueOnce({ boardId: 'board', predecessorId: 'a' });
    await rejected(service.setDependency('board', 'a', 'b', 'actor', '"1"'), 409, 'DEPENDENCY_CYCLE');
  });
  it('rejects Viewer writes before inspecting cards', async () => {
    tx.boardMember.findUnique.mockResolvedValue({ role: Role.VIEWER });
    await rejected(service.setDependency('board', 'a', null, 'actor', '"1"'), 403, 'FORBIDDEN');
    expect(tx.card.findUnique).not.toHaveBeenCalled();
  });
  it('rejects an invitee who is not yet a member', async () => {
    tx.boardMember.findUnique.mockResolvedValue(null);
    await rejected(service.setDependency('board', 'a', null, 'actor', '"1"'), 403, 'NOT_MEMBER');
  });
  it('keeps the last Owner unchanged', async () => {
    await rejected(service.changeRole('board', 'owner', Role.EDITOR, 'actor', '"1"'), 409, 'LAST_OWNER');
    expect(tx.board.updateMany).not.toHaveBeenCalled();
  });
  it('reports CAS conflicts without creating activity', async () => {
    tx.card.findUnique.mockResolvedValueOnce({ boardId: 'board', version: 1 })
      .mockResolvedValueOnce({ boardId: 'board', version: 2 });
    tx.card.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.setDependency('board', 'a', null, 'actor', '"1"'))
      .rejects.toMatchObject({ response: { code: 'VERSION_CONFLICT', details: { version: 2 } } });
    expect(tx.activity.create).not.toHaveBeenCalled();
  });
  it('maps only named board-scope foreign keys to CROSS_BOARD', async () => {
    const error = new Prisma.PrismaClientKnownRequestError('FK failed', {
      code: 'P2003', clientVersion: '5.22.0',
      meta: { field_name: 'cards_predecessor_board_fk (index)' },
    });
    await expect(service.run(async () => { throw error; }))
      .rejects.toMatchObject({ response: { code: 'CROSS_BOARD' } });
    const unrelated = new Prisma.PrismaClientKnownRequestError('FK failed', {
      code: 'P2003', clientVersion: '5.22.0', meta: { field_name: 'comments_author_id_fkey' },
    });
    await expect(service.run(async () => { throw unrelated; })).rejects.toBe(unrelated);
  });
  it('validates the named deferred owner constraint after all transaction work', async () => {
    const work = jest.fn().mockResolvedValue('result');
    expect(await service.run(work)).toBe('result');
    expect(tx.$executeRaw.mock.calls[0][0].join('')).toBe('SET CONSTRAINTS boards_require_owner IMMEDIATE');
    expect(work.mock.invocationCallOrder[0]).toBeLessThan(tx.$executeRaw.mock.invocationCallOrder[0]);
  });
  it('maps only the owner constraint validation SQLSTATE/message pair', async () => {
    const error = new Prisma.PrismaClientKnownRequestError('Query failed', {
      code: 'P2010', clientVersion: '5.22.0', meta: { code: '23514', message: 'ERROR: LAST_OWNER' },
    });
    tx.$executeRaw.mockRejectedValueOnce(error);
    await expect(service.run(async () => 'result')).rejects.toMatchObject({ status: 409, response: { code: 'LAST_OWNER', details: {} } });
    const unrelated = new Prisma.PrismaClientKnownRequestError('LAST_OWNER somewhere', {
      code: 'P2010', clientVersion: '5.22.0', meta: { code: '23514', message: 'different check' },
    });
    tx.$executeRaw.mockRejectedValueOnce(unrelated);
    await expect(service.run(async () => 'result')).rejects.toBe(unrelated);
    await expect(service.run(async () => { throw error; })).rejects.toBe(error);
  });
});
