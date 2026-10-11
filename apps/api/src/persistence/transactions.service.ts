import { Injectable } from '@nestjs/common';
import { Prisma, Role } from '../../generated/client';
import { checkVersion, fail, requireIfMatch } from '../common/if-match';
import { PrismaService } from './prisma.service';

type Tx = Prisma.TransactionClient;
const crossBoardConstraints = [
  'cards_column_board_fk', 'cards_predecessor_board_fk',
  'cards_assignee_board_fk', 'card_tags_card_board_fk', 'card_tags_tag_board_fk',
];

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async run<T>(work: (tx: Tx) => Promise<T>): Promise<T> {
    try {
      return await this.prisma.$transaction(work, {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      });
    } catch (error) {
      // Translate only named board-scope FKs, never every foreign-key failure.
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        const metadata = JSON.stringify(error.meta ?? {});
        if (error.code === 'P2003' &&
            crossBoardConstraints.some((name) => metadata.includes(name))) {
          fail(422, 'CROSS_BOARD');
        }
        if (metadata.includes('boards_require_owner')) fail(409, 'LAST_OWNER');
      }
      throw error;
    }
  }

  async lockBoard(tx: Tx, boardId: string) {
    const rows = await tx.$queryRaw<{ id: string }[]>
      `SELECT id FROM boards WHERE id = ${boardId}::uuid FOR UPDATE`;
    if (!rows.length) fail(404, 'NOT_FOUND');
  }

  // WIP writers must lock the destination column, not the whole board.
  async lockColumn(tx: Tx, columnId: string, boardId: string) {
    const rows = await tx.$queryRaw<{ id: string; board_id: string }[]>
      `SELECT id, board_id FROM columns WHERE id = ${columnId}::uuid FOR UPDATE`;
    if (!rows.length) fail(404, 'NOT_FOUND');
    if (rows[0].board_id !== boardId) fail(422, 'CROSS_BOARD');
  }

  private async member(tx: Tx, boardId: string, userId: string, ownerOnly = false) {
    const member = await tx.boardMember.findUnique({
      where: { boardId_userId: { boardId, userId } },
    });
    if (!member) fail(403, 'NOT_MEMBER');
    if (member.role === Role.VIEWER || (ownerOnly && member.role !== Role.OWNER)) {
      fail(403, 'FORBIDDEN');
    }
  }

  // Internal foundation only; authenticated HTTP controllers follow in later BE work.
  async setDependency(boardId: string, cardId: string, predecessorId: string | null,
                      actorId: string, ifMatch?: string) {
    const expected = requireIfMatch(ifMatch);
    return this.run(async (tx) => {
      await this.lockBoard(tx, boardId);
      await this.member(tx, boardId, actorId);
      const card = await tx.card.findUnique({ where: { id: cardId } });
      if (!card) fail(404, 'NOT_FOUND');
      if (card.boardId !== boardId) fail(422, 'CROSS_BOARD');
      checkVersion(expected, card.version);
      const visited = new Set([cardId]);
      let cursor = predecessorId;
      while (cursor !== null) {
        if (visited.has(cursor)) fail(409, 'DEPENDENCY_CYCLE');
        visited.add(cursor);
        const predecessor = await tx.card.findUnique({ where: { id: cursor } });
        if (!predecessor) fail(404, 'NOT_FOUND');
        if (predecessor.boardId !== boardId) fail(422, 'CROSS_BOARD');
        cursor = predecessor.predecessorId;
      }
      // CAS also protects against concurrent card edits that do not take the board lock.
      const changed = await tx.card.updateMany({
        where: { id: cardId, boardId, version: expected },
        data: { predecessorId, version: { increment: 1 } },
      });
      if (!changed.count) {
        const current = await tx.card.findUnique({ where: { id: cardId } });
        if (!current) fail(404, 'NOT_FOUND');
        fail(409, 'VERSION_CONFLICT', { version: current.version });
      }
      await tx.activity.create({ data: {
        cardId, actorId,
        action: predecessorId === null ? 'DEPENDENCY_CLEARED' : 'DEPENDENCY_SET',
        metadata: { predecessorId },
      } });
      return tx.card.findUniqueOrThrow({ where: { id: cardId } });
    });
  }

  async changeRole(boardId: string, userId: string, role: Role,
                   actorId: string, ifMatch?: string) {
    const expected = requireIfMatch(ifMatch);
    return this.run(async (tx) => {
      await this.lockBoard(tx, boardId);
      await this.member(tx, boardId, actorId, true);
      const board = await tx.board.findUniqueOrThrow({ where: { id: boardId } });
      checkVersion(expected, board.version);
      const target = await tx.boardMember.findUnique({
        where: { boardId_userId: { boardId, userId } },
      });
      if (!target) fail(404, 'NOT_FOUND');
      if (target.role === Role.OWNER && role !== Role.OWNER &&
          await tx.boardMember.count({ where: { boardId, role: Role.OWNER } }) === 1) {
        fail(409, 'LAST_OWNER');
      }
      const changed = await tx.board.updateMany({
        where: { id: boardId, version: expected },
        data: { version: { increment: 1 } },
      });
      if (!changed.count) {
        const current = await tx.board.findUniqueOrThrow({ where: { id: boardId } });
        fail(409, 'VERSION_CONFLICT', { version: current.version });
      }
      return tx.boardMember.update({
        where: { boardId_userId: { boardId, userId } }, data: { role },
      });
    });
  }
}
