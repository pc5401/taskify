import type { Board, BoardPage, ApiErrorBody } from './contract.ts';
export interface User { id: string; email: string; nickname: string; createdAt: string; avatarUrl?: string | null }
export interface LoginInput { email: string; password: string }
export interface RegisterInput extends LoginInput { nickname: string }
export interface CreateBoardInput { title: string; description?: string; color?: string }
export class BrowserApiError extends Error {
  constructor(readonly status: number, readonly body: Partial<ApiErrorBody> | undefined) {
    super(body?.message ?? `요청을 처리하지 못했습니다 (${status}).`);
  }
}
/** Relative BFF-only requests. The server owns all credentials and token rotation. */
export function createBrowserApi(fetcher: typeof fetch = fetch) {
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
    logout: (signal?: AbortSignal) => request<void>('/auth/logout', 'POST', undefined, signal),
  };
}
