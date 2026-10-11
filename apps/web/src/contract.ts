/** Hand-maintained FE-1 subset of docs/contract/openapi.yaml v0.2.1.
 * UUID/date-time are wire strings; validation constraints remain in OpenAPI.
 */
export type Role = 'OWNER' | 'EDITOR' | 'VIEWER';
export type CardWarning = 'BLOCKED_BY_PREDECESSOR';
export interface Board {
  id: string;
  title: string;
  description?: string | null;
  color: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}
/** Caller membership, only guaranteed on list items; never a stored Board field. */
export interface BoardListItem extends Board { myRole: Role }
export interface BoardPage { items: BoardListItem[]; nextCursor: string | null }
export interface Column {
  id: string;
  boardId: string;
  title: string;
  position: number;
  wipLimit?: number | null;
  isDone: boolean;
  version: number;
}
export interface Card {
  id: string;
  boardId: string;
  columnId: string;
  title: string;
  description?: string | null;
  assigneeId?: string | null;
  dueAt?: string | null;
  position: number;
  predecessorId?: string | null;
  /** Computed by the server. Do not derive from a local completed flag. */
  blocked: boolean;
  warnings: CardWarning[];
  tagNames?: string[];
  version: number;
  createdAt: string;
  updatedAt: string;
}
export interface CardPage { items: Card[]; nextCursor: string | null }
export type ApiErrorCode =
  | 'UNAUTHENTICATED' | 'INVALID_CREDENTIALS' | 'NOT_MEMBER' | 'FORBIDDEN'
  | 'NOT_FOUND' | 'INVALID_INPUT' | 'EMAIL_TAKEN' | 'VERSION_CONFLICT'
  | 'IF_MATCH_REQUIRED' | 'WIP_LIMIT_EXCEEDED' | 'DEPENDENCY_CYCLE'
  | 'CROSS_BOARD' | 'LAST_OWNER' | 'LAST_DONE_COLUMN' | 'COLUMN_NOT_EMPTY'
  | 'ALREADY_MEMBER' | 'INVITATION_NOT_ACCEPTED';
export interface ApiErrorBody { code: ApiErrorCode; message: string; details: Record<string, unknown> }
