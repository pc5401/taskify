import { validateSync } from 'class-validator';
import { CreateCardRequest } from './cards.dto';
import { CardsService, placement } from './cards.service';
const id = '11111111-1111-4111-8111-111111111111';
const dest = '22222222-2222-4222-8222-222222222222';
describe('card writes', () => {
  test.each([
    [[], 0, 0],
    [[{ position: 0 }], 1, 1024],
    [[{ position: 0 }, { position: 1024 }], 1, 512],
    [[{ position: 0 }, { position: 1 }], 1, null],
    [[{ position: 2147483647 }], 1, null],
    [[{ position: -2147483648 }], 0, null],
  ])('position allocation %j', (rows, index, expected) =>
    expect(placement(rows as any, index as number)).toBe(expected),
  );
  test.each(['2026-10-13', '2026-10-13T10:10:10', '2026-02-30T10:10:10Z'])(
    'rejects non RFC3339 dates %s',
    (dueAt) =>
      expect(
        validateSync(
          Object.assign(new CreateCardRequest(), { title: 'x', dueAt }),
        ),
      ).not.toHaveLength(0),
  );
  test.each(['2026-10-13T10:10:10Z', '2026-10-13T10:10:10.123+09:00'])(
    'accepts date time %s',
    (dueAt) =>
      expect(
        validateSync(
          Object.assign(new CreateCardRequest(), {
            title: ' ',
            dueAt,
            tagNames: [' A ', 'a'],
          }),
        ),
      ).toHaveLength(0),
  );
  function setup(role = 'OWNER') {
    const card = { id, boardId: id, columnId: dest, position: 0, version: 3 };
    const tx: any = {
      boardMember: { findUnique: jest.fn().mockResolvedValue({ role }) },
      column: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: dest, boardId: id, wipLimit: 1 }),
      },
      card: {
        findUnique: jest.fn().mockResolvedValue(card),
        findMany: jest.fn().mockResolvedValue([card]),
        findUniqueOrThrow: jest
          .fn()
          .mockResolvedValue({
            ...card,
            column: { isDone: false },
            predecessor: null,
            tags: [],
          }),
        updateMany: jest.fn(),
        update: jest.fn(),
      },
      activity: { create: jest.fn() },
      $queryRaw: jest.fn().mockResolvedValue([]),
    };
    return {
      tx,
      service: new CardsService({ run: (work: any) => work(tx) } as any),
    };
  }
  test('unchanged end placement keeps version and creates no activity even full WIP', async () => {
    const { tx, service } = setup();
    expect(
      (await service.move(id, id, { toColumnId: dest }, '"3"')).version,
    ).toBe(3);
    expect(tx.card.updateMany).not.toHaveBeenCalled();
    expect(tx.activity.create).not.toHaveBeenCalled();
  });
  test('stale version checked before no-op', async () => {
    const { tx, service } = setup();
    await expect(
      service.move(id, id, { toColumnId: dest }, '"2"'),
    ).rejects.toMatchObject({
      response: { code: 'VERSION_CONFLICT', details: { version: 3 } },
    });
    expect(tx.activity.create).not.toHaveBeenCalled();
  });
  test('self before invalid without mutation', async () => {
    const { tx, service } = setup();
    await expect(
      service.move(id, id, { toColumnId: dest, beforeCardId: id }, '"3"'),
    ).rejects.toMatchObject({ response: { code: 'INVALID_INPUT' } });
    expect(tx.card.updateMany).not.toHaveBeenCalled();
  });
  test('viewer rejected before row locks', async () => {
    const { tx, service } = setup('VIEWER');
    await expect(
      service.move(id, id, { toColumnId: dest }, '"3"'),
    ).rejects.toMatchObject({ response: { code: 'FORBIDDEN' } });
    expect(tx.$queryRaw).not.toHaveBeenCalled();
  });
});
