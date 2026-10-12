import 'server-only';
import { Pool } from 'pg';
import { Bff } from './bff';
import { encryptionKey } from './crypto';
import { PostgresSessionStore } from './store';
let instance: Bff | undefined;
export function bff(): Bff {
  if (instance) return instance;
  const key = encryptionKey(process.env.TASKIFY_SESSION_KEY);
  const origin = new URL(process.env.NEXT_APP_ORIGIN ?? '').origin;
  const api = new URL(process.env.TASKIFY_API_BASE ?? '');
  if (api.username || api.password || api.search || api.hash) throw new Error('Invalid API URL');
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL required');
  instance = new Bff({ key, origin, apiBase: api.toString().replace(/\/$/, ''), production: process.env.NODE_ENV === 'production' }, new PostgresSessionStore(new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000, query_timeout: 15000 })));
  return instance;
}
export async function route(request: Request, path: Parameters<Bff['handle']>[1]) {
  // Configuration errors fail closed before any request reaches Nest or PostgreSQL.
  return bff().handle(request, path);
}
