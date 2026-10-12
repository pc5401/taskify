import { decrypt, encrypt, loginDeadline, opaqueSession, sessionHash } from './crypto.ts';
import type { Tokens } from './crypto.ts';
import type { SessionStore } from './store.ts';
export type Config = { origin: string; apiBase: string; key: Buffer; production: boolean };
const COOKIE = 'taskify_session';
const error = (status: number, code: string | undefined, message: string) => Response.json({ ...(code ? { code } : {}), message, details: {} }, { status, headers: { 'Cache-Control': 'no-store' } });
const unauthorized = () => error(401, 'UNAUTHENTICATED', 'Login required');
function redact(value: unknown, secrets: string[] = []): unknown {
  if (typeof value === 'string') return secrets.reduce((v, s) => s ? v.replaceAll(s, '[redacted]') : v, value);
  if (Array.isArray(value)) return value.map(v => redact(v, secrets));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([k]) => !/access.?token|refresh.?token|authorization/i.test(k)).map(([k,v]) => [k, redact(v, secrets)]));
  return value;
}
export class Bff {
  constructor(private config: Config, private store: SessionStore, private fetcher: typeof fetch = fetch, private clock: () => number = Date.now) {}
  private cookie(value: string, deadline: number) {
    return `${COOKIE}=${value}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${Math.max(0, Math.floor((deadline-this.clock())/1000))}; Expires=${new Date(deadline).toUTCString()}${this.config.production ? '; Secure' : ''}`;
  }
  private clear(response: Response) { response.headers.set('Set-Cookie', this.cookie('', 0)); return response; }
  private async upstream(path: string, method: string, body?: string, token?: string, ifMatch?: string | null) {
    const headers = new Headers({ Accept: 'application/json' });
    if (body !== undefined) headers.set('Content-Type', 'application/json');
    if (token) headers.set('Authorization', `Bearer ${token}`);
    if (ifMatch) headers.set('If-Match', ifMatch);
    return this.fetcher(`${this.config.apiBase}${path}`, { method, headers, body, redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(10000) });
  }
  private async relay(response: Response, secrets: string[] = []) {
    const headers = new Headers({ 'Cache-Control': 'no-store' });
    const etag = response.headers.get('etag'); if (etag) headers.set('ETag', etag);
    if (response.status === 204 || response.status === 304) return new Response(null, { status: response.status, headers });
    let value; try { value = await response.json(); } catch { return error(502, undefined, 'Invalid upstream response'); }
    return Response.json(redact(value, secrets), { status: response.status, headers });
  }
  async handle(request: Request, path: '/auth/login' | '/auth/register' | '/auth/logout' | '/me' | '/boards'): Promise<Response> {
    if (!['GET','HEAD'].includes(request.method) && request.headers.get('origin') !== this.config.origin) return error(403, 'FORBIDDEN', 'Origin forbidden');
    try {
      const body = ['GET','HEAD'].includes(request.method) ? undefined : await request.text();
      if (path === '/auth/login' || path === '/auth/register') {
        const response = await this.upstream(path, request.method, body);
        if (!response.ok) return this.relay(response);
        const data = await response.json();
        if (typeof data.accessToken !== 'string' || typeof data.refreshToken !== 'string' || !data.user) return error(502, undefined, 'Invalid upstream auth response');
        const tokens: Tokens = { accessToken: data.accessToken, refreshToken: data.refreshToken };
        const deadline = loginDeadline(tokens.accessToken, this.clock()), opaque = opaqueSession(), hash = sessionHash(opaque);
        await this.store.create(hash, encrypt(tokens, this.config.key, hash), new Date(deadline));
        return Response.json({ user: redact(data.user, Object.values(tokens)) }, { status: response.status, headers: { 'Set-Cookie': this.cookie(opaque, deadline), 'Cache-Control': 'no-store' } });
      }
      const opaque = request.headers.get('cookie')?.split(';').map(v => v.trim()).find(v => v.startsWith(`${COOKIE}=`))?.slice(COOKIE.length+1);
      if (!opaque || !/^[a-f0-9]{64}$/.test(opaque)) return this.clear(unauthorized());
      const hash = sessionHash(opaque);
      return await this.store.locked(hash, async (row, tx) => {
        if (!row || row.revoked_at || row.expires_at.getTime() <= this.clock()) return this.clear(unauthorized());
        let tokens: Tokens;
        try { tokens = decrypt(row.encrypted_tokens, this.config.key, hash); } catch { await tx.revoke(); return this.clear(unauthorized()); }
        let response: Response;
        const send = () => this.upstream(path + (path === '/boards' && request.method === 'GET' ? new URL(request.url).search : ''), request.method, body, tokens.accessToken, request.headers.get('if-match'));
        try {
          response = await send();
          if (response.status === 401) {
            if (row.expires_at.getTime() <= this.clock()) { await tx.revoke(); return this.clear(unauthorized()); }
            const refresh = await this.upstream('/auth/refresh', 'POST', JSON.stringify({ refreshToken: tokens.refreshToken }));
            if (!refresh.ok) {
              if (refresh.status === 401) await tx.revoke();
              if (path === '/auth/logout') { await tx.revoke(); return this.clear(await this.relay(refresh, Object.values(tokens))); }
              const failed = await this.relay(refresh, Object.values(tokens));
              return refresh.status === 401 ? this.clear(failed) : failed;
            }
            const next = await refresh.json();
            if (typeof next.accessToken !== 'string' || typeof next.refreshToken !== 'string') throw new Error('Invalid refresh');
            tokens = { accessToken: next.accessToken, refreshToken: next.refreshToken };
            await tx.save(encrypt(tokens, this.config.key, hash));
            if (row.expires_at.getTime() <= this.clock()) { await tx.revoke(); return this.clear(unauthorized()); }
            response = await send();
          }
          if (path === '/auth/logout' || response.status === 401) { await tx.revoke(); return this.clear(await this.relay(response, Object.values(tokens))); }
          return this.relay(response, Object.values(tokens));
        } catch {
          // A failed network revoke cannot promise that the upstream session was revoked.
          await tx.revoke();
          return this.clear(error(502, undefined, path === '/auth/logout' ? 'Local logout completed; upstream revocation could not be confirmed' : 'Upstream failed; login required'));
        }
      });
    } catch { return error(502, undefined, 'BFF unavailable'); }
  }
}

