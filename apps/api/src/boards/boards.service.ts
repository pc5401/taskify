import { Injectable } from '@nestjs/common';
import { PrismaService } from '../persistence/prisma.service';
import { CreateBoardRequest } from './boards.dto';
import { fail } from '../common/if-match';
import { Role } from '../../generated/client';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function parseBoardPage(cursor?: unknown, limit?: unknown) {
  let size = 20;
  if (limit !== undefined) {
    if (typeof limit !== 'string' || !/^\d+$/.test(limit)) fail(422, 'INVALID_INPUT');
    size = Number(limit);
    if (!Number.isInteger(size) || size < 1 || size > 100) fail(422, 'INVALID_INPUT');
  }
  let boundary: { joinedAt: Date; boardId: string } | undefined;
  if (cursor !== undefined) {
    try {
      if (typeof cursor !== 'string' || !/^[A-Za-z0-9_-]+$/.test(cursor)) throw new Error();
      const decoded = Buffer.from(cursor, 'base64url');
      if (decoded.toString('base64url') !== cursor) throw new Error();
      const value = JSON.parse(decoded.toString('utf8'));
      if (!value || Object.keys(value).sort().join(',') !== 'boardId,joinedAt' ||
          typeof value.joinedAt !== 'string' || typeof value.boardId !== 'string' || !uuid.test(value.boardId)) throw new Error();
      const joinedAt = new Date(value.joinedAt);
      if (!Number.isFinite(joinedAt.getTime()) || joinedAt.toISOString() !== value.joinedAt) throw new Error();
      boundary = { joinedAt, boardId: value.boardId };
    } catch { fail(422, 'INVALID_INPUT'); }
  }
  return { size, boundary };
}
const publicBoard = (board: any) => ({ id: board.id, title: board.title, description: board.description,
  color: board.color, version: board.version, createdAt: board.createdAt, updatedAt: board.updatedAt });

@Injectable()
export class BoardsService {
  constructor(private readonly prisma: PrismaService) {}
  async list(userId: string, cursor?: unknown, limit?: unknown) {
    const { size, boundary } = parseBoardPage(cursor, limit);
    const rows = await this.prisma.boardMember.findMany({
      where: { userId, ...(boundary ? { OR: [
        { joinedAt: { lt: boundary.joinedAt } },
        { joinedAt: boundary.joinedAt, boardId: { lt: boundary.boardId } },
      ] } : {}) },
      orderBy: [{ joinedAt: 'desc' }, { boardId: 'desc' }], take: size + 1, include: { board: true },
    });
    const page = rows.slice(0, size);
    const last = page[page.length - 1];
    return { items: page.map(row => ({ ...publicBoard(row.board), myRole: row.role })),
      nextCursor: rows.length > size ? Buffer.from(JSON.stringify({ joinedAt: last.joinedAt.toISOString(), boardId: last.boardId })).toString('base64url') : null };
  }
  async create(userId: string, input: CreateBoardRequest) {
    return this.prisma.$transaction(async tx => {
      const board = await tx.board.create({ data: { title: input.title, description: input.description,
        color: input.color === undefined ? '#5534DA' : input.color } });
      await tx.boardMember.create({ data: { boardId: board.id, userId, role: Role.OWNER } });
      await tx.column.createMany({ data: ['할 일', '하는 중', '완료'].map((title, position) => ({
        boardId: board.id, title, position: position * 1024, isDone: position === 2,
      })) });
      return publicBoard(board);
    });
  }
}
