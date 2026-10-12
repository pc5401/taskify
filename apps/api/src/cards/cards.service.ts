import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma } from '../../generated/client';
import { TransactionsService } from '../persistence/transactions.service';
import { fail, checkVersion, requireIfMatch } from '../common/if-match';
import { readUuid, publicReadCard } from '../boards/board-reads.service';
import { CreateCardRequest, MoveCardRequest } from './cards.dto';
type Tx = Prisma.TransactionClient;
class SourceChanged extends Error {}
export function placement(
  rows: { position: number }[],
  index: number,
): number | null {
  const left = rows[index - 1]?.position,
    right = rows[index]?.position;
  const n =
    left === undefined
      ? right === undefined
        ? 0
        : right - 1024
      : right === undefined
        ? left + 1024
        : right - left > 1
          ? left + Math.floor((right - left) / 2)
          : NaN;
  return Number.isInteger(n) && n >= -2147483648 && n <= 2147483647 ? n : null;
}
@Injectable()
export class CardsService {
  constructor(private readonly transactions: TransactionsService) {}
  private async writer(tx: Tx, boardId: string, userId: string) {
    const member = await tx.boardMember.findUnique({
      where: { boardId_userId: { boardId, userId } },
    });
    if (!member) fail(403, 'NOT_MEMBER');
    if (member.role === 'VIEWER') fail(403, 'FORBIDDEN');
  }
  private async columns(tx: Tx, ids: string[]) {
    await tx.$queryRaw(
      Prisma.sql`SELECT id FROM columns WHERE id IN (${Prisma.join([...new Set(ids)].sort().map((id) => Prisma.sql`${id}::uuid`))}) ORDER BY id FOR UPDATE`,
    );
  }
  private async cards(tx: Tx, columnId: string, id: string) {
    await tx.$queryRaw`SELECT id FROM cards WHERE column_id=${columnId}::uuid OR id=${id}::uuid ORDER BY id FOR UPDATE`;
    return tx.card.findMany({
      where: { columnId },
      orderBy: [{ position: 'asc' }, { id: 'asc' }],
    });
  }
  private async result(tx: Tx, id: string) {
    return publicReadCard(
      await tx.card.findUniqueOrThrow({
        where: { id },
        include: {
          column: true,
          predecessor: { include: { column: true } },
          tags: { include: { tag: true } },
        },
      }),
    );
  }
  private async allocate(
    tx: Tx,
    rows: { id: string; position: number }[],
    index: number,
    id: string,
  ) {
    const p = placement(rows, index);
    if (p !== null) return p;
    const sequence = [...rows];
    sequence.splice(index, 0, { id, position: 0 });
    if ((sequence.length - 1) * 1024 > 2147483647) fail(422, 'INVALID_INPUT');
    for (let i = 0; i < sequence.length; i++)
      if (sequence[i].id !== id && sequence[i].position !== i * 1024)
        await tx.card.update({
          where: { id: sequence[i].id },
          data: { position: i * 1024, version: { increment: 1 } },
        });
    return index * 1024;
  }
  async create(rawId: unknown, userId: string, input: CreateCardRequest) {
    const columnId = readUuid(rawId),
      id = randomUUID();
    return this.transactions.run(async (tx) => {
      let column = await tx.column.findUnique({ where: { id: columnId } });
      if (!column) fail(403, 'NOT_MEMBER');
      await this.writer(tx, column.boardId, userId);
      await this.columns(tx, [columnId]);
      column = await tx.column.findUnique({ where: { id: columnId } });
      if (!column) fail(403, 'NOT_MEMBER');
      await this.writer(tx, column.boardId, userId);
      if (input.assigneeId) {
        if (!(await tx.user.findUnique({ where: { id: input.assigneeId } })))
          fail(422, 'INVALID_INPUT');
        if (
          !(await tx.boardMember.findUnique({
            where: {
              boardId_userId: {
                boardId: column.boardId,
                userId: input.assigneeId,
              },
            },
          }))
        )
          fail(422, 'CROSS_BOARD');
      }
      if (input.predecessorId) {
        const predecessor = await tx.card.findUnique({
          where: { id: input.predecessorId },
        });
        if (!predecessor) fail(422, 'INVALID_INPUT');
        if (predecessor.boardId !== column.boardId) fail(422, 'CROSS_BOARD');
      }
      const rows = await this.cards(tx, columnId, id);
      if (column.wipLimit !== null && rows.length >= column.wipLimit)
        fail(409, 'WIP_LIMIT_EXCEEDED');
      const position = await this.allocate(tx, rows, rows.length, id);
      await tx.card.create({
        data: {
          id,
          boardId: column.boardId,
          columnId,
          title: input.title,
          description: input.description,
          creatorId: userId,
          assigneeId: input.assigneeId,
          predecessorId: input.predecessorId,
          dueAt: input.dueAt ? new Date(input.dueAt) : null,
          position,
        },
      });
      if (input.tagNames?.length) {
        const names = await tx.$queryRaw<{ name: string; canonical: string }[]>(
          Prisma.sql`SELECT name,lower(name) AS canonical FROM (VALUES ${Prisma.join(input.tagNames.map((name, i) => Prisma.sql`(${name}::text,${i}::int)`))}) incoming(name,ordinal) ORDER BY lower(name) COLLATE "C",ordinal`,
        );
        const seen = new Set<string>();
        for (const name of names) {
          if (seen.has(name.canonical)) continue;
          seen.add(name.canonical);
          const tags = await tx.$queryRaw<
            { id: string }[]
          >`INSERT INTO tags(id,board_id,name) VALUES(${randomUUID()}::uuid,${column.boardId}::uuid,${name.name}) ON CONFLICT(board_id,lower(name)) DO UPDATE SET name=tags.name RETURNING id`;
          await tx.cardTag.create({
            data: { cardId: id, tagId: tags[0].id, boardId: column.boardId },
          });
        }
      }
      await tx.activity.create({
        data: {
          cardId: id,
          actorId: userId,
          action: 'CARD_CREATED',
          metadata: { columnId },
        },
      });
      return this.result(tx, id);
    });
  }
  async move(
    rawId: unknown,
    userId: string,
    input: MoveCardRequest,
    match?: string,
  ) {
    const id = readUuid(rawId),
      toColumnId = readUuid(input.toColumnId);
    for (let attempt = 0; attempt < 3; attempt++)
      try {
        return await this.transactions.run(async (tx) => {
          const initial = await tx.card.findUnique({ where: { id } });
          if (!initial) fail(403, 'NOT_MEMBER');
          await this.writer(tx, initial.boardId, userId);
          const expected = requireIfMatch(match);
          await this.columns(tx, [initial.columnId, toColumnId]);
          const original = await this.cards(tx, toColumnId, id);
          const card = await tx.card.findUnique({ where: { id } });
          if (!card) fail(403, 'NOT_MEMBER');
          if (card.columnId !== initial.columnId) throw new SourceChanged();
          await this.writer(tx, card.boardId, userId);
          checkVersion(expected, card.version);
          const column = await tx.column.findUnique({
            where: { id: toColumnId },
          });
          if (!column) fail(422, 'INVALID_INPUT');
          if (column.boardId !== card.boardId) fail(422, 'CROSS_BOARD');
          if (input.beforeCardId === id) fail(422, 'INVALID_INPUT');
          const rows = original.filter((row) => row.id !== id);
          let index = rows.length;
          if (input.beforeCardId) {
            const before = await tx.card.findUnique({
              where: { id: input.beforeCardId },
            });
            if (!before) fail(422, 'INVALID_INPUT');
            if (before.boardId !== card.boardId) fail(422, 'CROSS_BOARD');
            index = rows.findIndex((row) => row.id === before.id);
            if (index < 0) fail(422, 'INVALID_INPUT');
          }
          const desired = rows.map((row) => row.id);
          desired.splice(index, 0, id);
          if (
            card.columnId === toColumnId &&
            original.every((row, i) => row.id === desired[i])
          )
            return this.result(tx, id);
          if (column.wipLimit !== null && rows.length >= column.wipLimit)
            fail(409, 'WIP_LIMIT_EXCEEDED');
          const position = await this.allocate(tx, rows, index, id);
          const updated = await tx.card.updateMany({
            where: { id, version: expected },
            data: { columnId: toColumnId, position, version: { increment: 1 } },
          });
          if (updated.count !== 1)
            fail(409, 'VERSION_CONFLICT', {
              version: (await tx.card.findUniqueOrThrow({ where: { id } }))
                .version,
            });
          await tx.activity.create({
            data: {
              cardId: id,
              actorId: userId,
              action: 'CARD_MOVED',
              metadata: {
                fromColumnId: card.columnId,
                toColumnId,
                beforeCardId: input.beforeCardId ?? null,
              },
            },
          });
          return this.result(tx, id);
        });
      } catch (error) {
        if (!(error instanceof SourceChanged)) throw error;
      }
    return this.transactions.run(async (tx) => {
      const card = await tx.card.findUnique({ where: { id } });
      if (!card) fail(403, 'NOT_MEMBER');
      await this.writer(tx, card.boardId, userId);
      fail(409, 'VERSION_CONFLICT', { version: card.version });
    });
  }
}
