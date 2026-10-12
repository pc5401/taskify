import { Injectable } from '@nestjs/common';
import { PrismaService } from '../persistence/prisma.service';
import { fail } from '../common/if-match';
import { parseBoardPage } from './boards.service';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function readUuid(value: unknown): string {
  if (typeof value !== 'string' || !uuidPattern.test(value)) fail(422, 'INVALID_INPUT');
  return value.toLowerCase();
}
type Filters = { columnId: string | null; assigneeId: string | null; tag: string | null };
type CardBoundary = { position: number; id: string };
export function parseCardRead(boardId: string, query: Record<string, unknown> = {}) {
  const filters: Filters = {
    columnId: query.columnId === undefined ? null : readUuid(query.columnId),
    assigneeId: query.assigneeId === undefined ? null : readUuid(query.assigneeId),
    tag: query.tag === undefined ? null : typeof query.tag === 'string' ? query.tag : fail(422, 'INVALID_INPUT'),
  };
  const { size } = parseBoardPage(undefined, query.limit);
  let boundary: CardBoundary | undefined;
  if (query.cursor !== undefined) {
    try {
      if (typeof query.cursor !== 'string' || !/^[A-Za-z0-9_-]+$/.test(query.cursor)) throw new Error();
      const bytes = Buffer.from(query.cursor, 'base64url');
      if (bytes.toString('base64url') !== query.cursor) throw new Error();
      const cursor = JSON.parse(bytes.toString('utf8'));
      if (!cursor || Object.keys(cursor).sort().join(',') !== 'boardId,filters,id,position' ||
          cursor.boardId !== boardId || !cursor.filters ||
          Object.keys(cursor.filters).sort().join(',') !== 'assigneeId,columnId,tag' ||
          Object.keys(filters).some(key => cursor.filters[key] !== filters[key]) ||
          !Number.isInteger(cursor.position) || cursor.position < -2147483648 || cursor.position > 2147483647 ||
          typeof cursor.id !== 'string' || !uuidPattern.test(cursor.id)) throw new Error();
      boundary = { position: cursor.position, id: cursor.id.toLowerCase() };
    } catch { fail(422, 'INVALID_INPUT'); }
  }
  return { size, filters, boundary };
}
export function publicReadCard(card: any) {
  const blocked = Boolean(card.predecessor && !card.predecessor.column.isDone);
  return { id: card.id, boardId: card.boardId, columnId: card.columnId, title: card.title,
    description: card.description, assigneeId: card.assigneeId, dueAt: card.dueAt,
    position: card.position, predecessorId: card.predecessorId,
    blocked, warnings: blocked && card.column.isDone ? ['BLOCKED_BY_PREDECESSOR'] : [],
    tagNames: card.tags.map(link => link.tag.name), version: card.version,
    createdAt: card.createdAt, updatedAt: card.updatedAt };
}

@Injectable()
export class BoardReadsService {
  constructor(private readonly prisma: PrismaService) {}
  private async membership(boardId: string, userId: string) {
    const member = await this.prisma.boardMember.findUnique({ where: { boardId_userId: { boardId, userId } }, select: { role: true } });
    if (!member) fail(403, 'NOT_MEMBER');
  }
  async board(rawBoardId: unknown, userId: string) {
    const boardId = readUuid(rawBoardId);
    await this.membership(boardId, userId);
    const board = await this.prisma.board.findUnique({ where: { id: boardId }, select: {
      id: true, title: true, description: true, color: true, version: true, createdAt: true, updatedAt: true,
    } });
    if (!board) fail(403, 'NOT_MEMBER');
    return board;
  }
  async columns(rawBoardId: unknown, userId: string) {
    const boardId = readUuid(rawBoardId);
    await this.membership(boardId, userId);
    const items = await this.prisma.column.findMany({ where: { boardId },
      orderBy: [{ position: 'asc' }, { id: 'asc' }], select: {
        id: true, boardId: true, title: true, position: true, wipLimit: true, isDone: true, version: true,
      } });
    return { items };
  }
  async cards(rawBoardId: unknown, userId: string, query: Record<string, unknown> = {}) {
    const boardId = readUuid(rawBoardId);
    // Authorization precedes cursor/filter evaluation so nonmembers see no board content.
    await this.membership(boardId, userId);
    const { size, filters, boundary } = parseCardRead(boardId, query);
    const rows = await this.prisma.card.findMany({ where: {
      boardId,
      ...(filters.columnId !== null ? { columnId: filters.columnId } : {}),
      ...(filters.assigneeId !== null ? { assigneeId: filters.assigneeId } : {}),
      ...(filters.tag !== null ? { tags: { some: { tag: { name: filters.tag } } } } : {}),
      ...(boundary ? { OR: [{ position: { gt: boundary.position } }, { position: boundary.position, id: { gt: boundary.id } }] } : {}),
    }, orderBy: [{ position: 'asc' }, { id: 'asc' }], take: size + 1,
    include: { column: { select: { isDone: true } }, predecessor: { select: { column: { select: { isDone: true } } } }, tags: { select: { tag: { select: { name: true } } } } },
    });
    const page = rows.slice(0, size); const last = page[page.length - 1];
    return { items: page.map(publicReadCard), nextCursor: rows.length > size ?
      Buffer.from(JSON.stringify({ boardId, filters, position: last.position, id: last.id })).toString('base64url') : null };
  }
}
