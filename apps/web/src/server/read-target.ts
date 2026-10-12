export type BffPath = '/auth/login' | '/auth/register' | '/auth/logout' | '/me' | '/boards' | `/boards/${string}` | `/columns/${string}/cards` | `/cards/${string}/move`;
export const boardUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const boardReadPath = /^\/boards\/([0-9a-fA-F-]+)(?:\/(columns|cards))?$/;
/** Only fixed read routes and their contract query keys may reach Nest. */
export function readTarget(request: Request, path: BffPath): string | Response {
  if (path.startsWith('/columns/') || path.startsWith('/cards/')) {
    const match = /^\/(columns|cards)\/([^/]+)\/(cards|move)$/.exec(path);
    if (!match || !boardUuid.test(match[2]) || (match[1] === 'columns' ? match[3] !== 'cards' : match[3] !== 'move')) return Response.json({ code: 'INVALID_INPUT', message: 'Invalid card write target', details: {} }, { status: 422 });
    if (request.method !== 'POST') return new Response(null, { status: 405, headers: { Allow: 'POST' } });
    return path;
  }
  if (!path.startsWith('/boards/')) return path + (path === '/boards' && request.method === 'GET' ? new URL(request.url).search : '');
  const match = boardReadPath.exec(path);
  const invalid = () => Response.json({ code: 'INVALID_INPUT', message: 'Invalid board read input', details: {} }, { status: 422, headers: { 'Cache-Control': 'no-store' } });
  if (!match || !boardUuid.test(match[1])) return invalid();
  if (request.method !== 'GET') return new Response(null, { status: 405, headers: { Allow: 'GET', 'Cache-Control': 'no-store' } });
  if (match[2] !== 'cards') return path;
  const source = new URL(request.url).searchParams, query = new URLSearchParams();
  for (const name of ['cursor', 'limit', 'columnId', 'assigneeId', 'tag']) {
    const values = source.getAll(name);
    if (values.length > 1) return invalid();
    if (values.length === 0) continue;
    const value = values[0];
    if (['columnId', 'assigneeId'].includes(name) && !boardUuid.test(value)) return invalid();
    if (name === 'limit' && (!/^\d+$/.test(value) || !Number.isInteger(Number(value)) || Number(value) < 1 || Number(value) > 100)) return invalid();
    query.set(name, value);
  }
  return path + (query.size ? `?${query}` : '');
}
