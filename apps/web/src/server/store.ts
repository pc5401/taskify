import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
export type Session = { session_hash: string; encrypted_tokens: string; expires_at: Date; revoked_at: Date | null };
export interface SessionTransaction { save(ciphertext: string): Promise<void>; revoke(): Promise<void> }
export interface SessionStore {
  create(hash: string, ciphertext: string, expires: Date): Promise<void>;
  locked<T>(hash: string, run: (row: Session | undefined, tx: SessionTransaction) => Promise<T>): Promise<T>;
}
export class PostgresSessionStore implements SessionStore {
  constructor(private pool: Pool) {}
  async create(hash: string, ciphertext: string, expires: Date) {
    await this.pool.query('INSERT INTO web_sessions (id, session_hash, encrypted_tokens, expires_at) VALUES ($1,$2,$3,$4)', [randomUUID(), hash, ciphertext, expires]);
  }
  async locked<T>(hash: string, run: (row: Session | undefined, tx: SessionTransaction) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      // SELECT returns the latest committed row after waiting for its PostgreSQL lock.
      const result = await client.query<Session>('SELECT session_hash, encrypted_tokens, expires_at, revoked_at FROM web_sessions WHERE session_hash=$1 FOR UPDATE', [hash]);
      const answer = await run(result.rows[0], {
        save: async ciphertext => { await client.query('UPDATE web_sessions SET encrypted_tokens=$2 WHERE session_hash=$1', [hash, ciphertext]); },
        revoke: async () => { await client.query('UPDATE web_sessions SET revoked_at=COALESCE(revoked_at,now()) WHERE session_hash=$1', [hash]); },
      });
      await client.query('COMMIT'); return answer;
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }
}
