import { BoardsService, parseBoardPage } from './boards.service';
describe('board creation transaction and cursor foundation (mock DB)', () => {
  it('propagates each transaction failure and skips later creation steps', async () => {
    for (const step of ['board', 'boardMember', 'column']) {
      const tx: any = { board: { create: jest.fn(async () => ({ id: 'board', version: 1 })) }, boardMember: { create: jest.fn() }, column: { createMany: jest.fn() } };
      tx[step][step === 'column' ? 'createMany' : 'create'].mockRejectedValueOnce(new Error('injected'));
      const prisma: any = { $transaction: jest.fn(async work => work(tx)) };
      await expect(new BoardsService(prisma).create('actor', { title: 'x' })).rejects.toThrow('injected');
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      if (step === 'board') expect(tx.boardMember.create).not.toHaveBeenCalled();
      if (step !== 'column') expect(tx.column.createMany).not.toHaveBeenCalled();
    }
  });
  it('rejects structurally malformed boundaries and limit types', () => {
    for (const data of [{ joinedAt: 'bad', boardId: 'bad' }, { joinedAt: '2026-10-12T00:00:00.000Z', boardId: 'bad' }, { extra: true }]) {
      expect(() => parseBoardPage(Buffer.from(JSON.stringify(data)).toString('base64url'))).toThrow();
    }
    for (const limit of [[], {}, '', 'NaN', '-1']) expect(() => parseBoardPage(undefined, limit)).toThrow();
    expect(parseBoardPage(undefined, '100').size).toBe(100);
  });
});
