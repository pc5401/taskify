import type { Board, BoardPage, CardPage } from './contract';

export interface HttpResult<T> { data: T; status: number; etag: string | null }
export class HttpError extends Error {
  constructor(readonly status: number, readonly body: unknown, readonly etag: string | null) {
    super(`HTTP ${status}`);
    this.name = 'HttpError';
  }
}
export class ResponseFormatError extends Error {
  constructor(readonly status: number) {
    super(`Expected JSON response (HTTP ${status})`);
    this.name = 'ResponseFormatError';
  }
}
/** Session policy belongs to the caller; no token store, automatic refresh or retry. */
export interface ReadContext {
  headers: HeadersInit;
  credentials: RequestCredentials;
  signal?: AbortSignal;
}
export interface Pagination { cursor?: string; limit?: number }

/** apiBase must explicitly include /v1. fetch implementation is injected, never mocked implicitly. */
export function createReadClient(apiBase: string, fetcher: typeof fetch) {
  const base = apiBase.replace(/\/$/, '');
  function query(page: Pagination): string {
    const params = new URLSearchParams();
    if (page.cursor !== undefined) params.set('cursor', page.cursor);
    if (page.limit !== undefined) params.set('limit', String(page.limit));
    const value = params.toString();
    return value ? `?${value}` : '';
  }
  async function get<T>(path: string, context: ReadContext): Promise<HttpResult<T>> {
    const headers = new Headers(context.headers);
    headers.set('Accept', 'application/json');
    const response = await fetcher(`${base}${path}`, {
      method: 'GET', headers, credentials: context.credentials,
      signal: context.signal, cache: 'no-store',
    });
    const text = await response.text();
    let body: unknown;
    let isJson = false;
    try { body = JSON.parse(text); isJson = true; } catch { body = text; }
    const etag = response.headers.get('ETag');
    if (!response.ok) throw new HttpError(response.status, body, etag);
    if (!isJson) throw new ResponseFormatError(response.status);
    // Boundary assertion only: runtime schema validation is not part of FE-1.
    return { data: body as T, status: response.status, etag };
  }
  return {
    listBoards: (context: ReadContext, page: Pagination = {}) =>
      get<BoardPage>(`/boards${query(page)}`, context),
    getBoard: (boardId: string, context: ReadContext) =>
      get<Board>(`/boards/${encodeURIComponent(boardId)}`, context),
    listCards: (boardId: string, context: ReadContext, page: Pagination = {}) =>
      get<CardPage>(`/boards/${encodeURIComponent(boardId)}/cards${query(page)}`, context),
  };
}
