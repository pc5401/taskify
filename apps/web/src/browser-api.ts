import type { Board, BoardPage, ApiErrorBody, Column, Card, CardPage } from './contract.ts';
export interface CardFilters { columnId?: string; assigneeId?: string; tag?: string; limit?: number }
export class CardPaginationError extends Error {}
export interface User { id: string; email: string; nickname: string; createdAt: string; avatarUrl?: string | null }
export interface LoginInput { email: string; password: string }
export interface RegisterInput extends LoginInput { nickname: string }
export interface CreateBoardInput { title: string; description?: string; color?: string }
export interface CreateCardInput { title: string; description?: string; assigneeId?: string | null; dueAt?: string | null; predecessorId?: string | null; tagNames?: string[] }
export interface MoveCardInput { toColumnId: string; beforeCardId?: string | null }
export interface CardWriteResult { card: Card; etag: string | null }
export class BrowserApiError extends Error {
  constructor(readonly status: number, readonly body: Partial<ApiErrorBody> | undefined) {
    super(body?.message ?? `요청을 처리하지 못했습니다 (${status}).`);
  }
}
/** Relative BFF-only requests. The server owns all credentials and token rotation. */
export function createBrowserApi(fetcher: typeof fetch = fetch) {
  async function writeCard(path: string, input: CreateCardInput | MoveCardInput, ifMatch?: string, signal?: AbortSignal): Promise<CardWriteResult> {
    const headers = new Headers({ Accept: 'application/json', 'Content-Type': 'application/json' });
    if (ifMatch !== undefined) headers.set('If-Match', ifMatch);
    const response = await fetcher(`/api${path}`, { method: 'POST', headers, body: JSON.stringify(input), credentials: 'same-origin', cache: 'no-store', redirect: 'error', signal });
    if (!response.ok) { let body; try { body = await response.json(); } catch {} throw new BrowserApiError(response.status, body); }
    return { card: await response.json(), etag: response.headers.get('etag') };
  }
  async function request<T>(path: string, method = 'GET', input?: unknown, signal?: AbortSignal): Promise<T> {
    const response = await fetcher(`/api${path}`, {
      method, credentials: 'same-origin', cache: 'no-store', redirect: 'error', signal,
      headers: input === undefined ? { Accept: 'application/json' } : { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: input === undefined ? undefined : JSON.stringify(input),
    });
    if (!response.ok) {
      let body; try { body = await response.json(); } catch { body = undefined; }
      throw new BrowserApiError(response.status, body);
    }
    if (response.status === 204) return undefined as T;
    return response.json();
  }
  const cardPage = (boardId: string, filters: CardFilters = {}, cursor: string | null = null, signal?: AbortSignal) => {
    const query = new URLSearchParams();
    for (const name of ['columnId', 'assigneeId', 'tag', 'limit'] as const) {
      if (filters[name] !== undefined) query.set(name, String(filters[name]));
    }
    if (cursor !== null) query.set('cursor', cursor);
    return request<CardPage>(`/boards/${encodeURIComponent(boardId)}/cards${query.size ? `?${query}` : ''}`, 'GET', undefined, signal);
  };
  return {
    login: (input: LoginInput, signal?: AbortSignal) => request<{ user: User }>('/auth/login', 'POST', input, signal),
    register: (input: RegisterInput, signal?: AbortSignal) => request<{ user: User }>('/auth/register', 'POST', input, signal),
    me: (signal?: AbortSignal) => request<User>('/me', 'GET', undefined, signal),
    boards: (cursor: string | null = null, signal?: AbortSignal) => {
      const query = new URLSearchParams();
      if (cursor !== null) query.set('cursor', cursor);
      return request<BoardPage>(`/boards${query.size ? `?${query}` : ''}`, 'GET', undefined, signal);
    },
    createBoard: (input: CreateBoardInput, signal?: AbortSignal) => request<Board>('/boards', 'POST', input, signal),
    createCard: (columnId: string, input: CreateCardInput, signal?: AbortSignal) => writeCard(`/columns/${encodeURIComponent(columnId)}/cards`, input, undefined, signal),
    moveCard: (cardId: string, input: MoveCardInput, ifMatch: string, signal?: AbortSignal) => writeCard(`/cards/${encodeURIComponent(cardId)}/move`, input, ifMatch, signal),
    boardRole: async (boardId: string, signal?: AbortSignal) => {
      const seen = new Set<string>(); let cursor: string | null = null;
      do {
        signal?.throwIfAborted();
        const page: BoardPage = await request<BoardPage>(`/boards${cursor === null ? '' : `?${new URLSearchParams({ cursor })}`}`, 'GET', undefined, signal);
        const board = page.items.find(item => item.id.toLowerCase() === boardId.toLowerCase()); if (board) return board.myRole;
        cursor = page.nextCursor;
        if (cursor !== null && seen.has(cursor)) throw new CardPaginationError('Repeated board cursor');
        if (cursor !== null) seen.add(cursor);
      } while (cursor !== null);
      return null;
    },
    board: (boardId: string, signal?: AbortSignal) => request<Board>(`/boards/${encodeURIComponent(boardId)}`, 'GET', undefined, signal),
    columns: (boardId: string, signal?: AbortSignal) => request<{ items: Column[] }>(`/boards/${encodeURIComponent(boardId)}/columns`, 'GET', undefined, signal),
    cardPage,
    allCards: async (boardId: string, filters: CardFilters = {}, signal?: AbortSignal): Promise<Card[]> => {
      const items: Card[] = [], ids = new Set<string>(), cursors = new Set<string>();
      let cursor: string | null = null;
      do {
        signal?.throwIfAborted();
        const page = await cardPage(boardId, filters, cursor, signal);
        signal?.throwIfAborted();
        if (!Array.isArray(page.items) || (page.nextCursor !== null && typeof page.nextCursor !== 'string')) throw new CardPaginationError('Invalid card page');
        for (const card of page.items) if (!ids.has(card.id)) { ids.add(card.id); items.push(card); }
        cursor = page.nextCursor;
        if (cursor !== null && cursors.has(cursor)) throw new CardPaginationError('Repeated card cursor');
        if (cursor !== null) cursors.add(cursor);
      } while (cursor !== null);
      return items;
    },
    logout: (signal?: AbortSignal) => request<void>('/auth/logout', 'POST', undefined, signal),
  };
}
