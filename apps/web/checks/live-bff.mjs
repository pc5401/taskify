// Real HTTP/PostgreSQL harness: opt-in and limited to its own newly created fixture.
// Never prints bodies, cookies, passwords, signing keys, tokens, or connection strings.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { createCipheriv, createDecipheriv, randomBytes, createHmac } from 'node:crypto';
import { Pool } from 'pg';
import { encrypt, decrypt, encryptionKey, sessionHash } from '../src/server/crypto.ts';
if (process.env.TASKIFY_LIVE_ENV_FILE) {
  let env;
  try { env = JSON.parse(await readFile(process.env.TASKIFY_LIVE_ENV_FILE, 'utf8')); }
  catch { throw new Error('Live environment file unavailable or invalid (details suppressed)'); }
  for (const [key,value] of Object.entries(env)) if (typeof value === 'string') process.env[key] = value;
}
const phase = process.argv[2] ?? 'initial';
function required(key) { if (!process.env[key]) throw new Error(`Required configuration: ${key}`); return process.env[key]; }
const dbName = required('TASKIFY_LIVE_DATABASE_NAME');
if (dbName !== 'taskify_validation') throw new Error('Harness requires the named isolated validation database');
let databaseUrl;
try { databaseUrl=new URL(required('DATABASE_URL')); } catch { throw new Error('Invalid isolated database configuration'); }
if (!['postgres:','postgresql:'].includes(databaseUrl.protocol) ||
    !['localhost','127.0.0.1','[::1]'].includes(databaseUrl.hostname) || databaseUrl.port !== '55432' ||
    databaseUrl.pathname !== '/taskify_validation') throw new Error('Isolated loopback55432 database URL guard refused configuration');
const base = process.env.TASKIFY_LIVE_BFF_BASE ?? 'http://localhost:3002';
const second = process.env.TASKIFY_LIVE_BFF_SECOND ?? 'http://localhost:3003';
const origin = required('NEXT_APP_ORIGIN');
const key = encryptionKey(required('TASKIFY_SESSION_KEY'));
const statePath = resolve('.runtime/live-bff-state.enc');
const pool = new Pool({ connectionString: required('DATABASE_URL'), connectionTimeoutMillis:5000, query_timeout:15000 });
let checks=0;
function check(condition,label) { if (!condition) throw new Error(`FAIL: ${label}`); checks++; console.log(`PASS: ${label}`); }
async function call(path, {method='GET',body,cookie,originValue=origin,host=base}={}) {
  const headers={Accept:'application/json'};
  if (originValue !== null) headers.Origin=originValue;
  if (cookie) headers.Cookie=cookie;
  if(body!==undefined) headers['Content-Type']='application/json';
  const response=await fetch(`${host}/api${path}`,{method,headers,body:body===undefined?undefined:JSON.stringify(body),redirect:'error',signal:AbortSignal.timeout(15000)});
  const text=await response.text(); let data; try{data=JSON.parse(text);}catch{data=undefined;}
  check(!/"(?:accessToken|refreshToken|passwordHash|encrypted_tokens)"\s*:/.test(text),`response secret-field exclusion ${method} ${path.split('?')[0]}`);
  return {status:response.status,data,setCookie:response.headers.get('set-cookie'),etag:response.headers.get('etag')};
}
async function save(state) {
  await mkdir(dirname(statePath),{recursive:true}); const iv=randomBytes(12), cipher=createCipheriv('aes-256-gcm',key,iv);
  cipher.setAAD(Buffer.from('taskify-live-fixture-v1'));
  const payload=Buffer.concat([cipher.update(JSON.stringify(state)),cipher.final()]);
  await writeFile(statePath,Buffer.concat([iv,cipher.getAuthTag(),payload]),{mode:0o600});
}
async function load() {
  const bytes=await readFile(statePath),cipher=createDecipheriv('aes-256-gcm',key,bytes.subarray(0,12));
  cipher.setAAD(Buffer.from('taskify-live-fixture-v1'));cipher.setAuthTag(bytes.subarray(12,28));
  return JSON.parse(Buffer.concat([cipher.update(bytes.subarray(28)),cipher.final()]).toString('utf8'));
}
async function row(state) { return (await pool.query('SELECT * FROM web_sessions WHERE session_hash=$1',[state.hash])).rows[0]; }
async function assertIdentity(state,host=base) { const result=await call('/me',{cookie:state.cookie,host});check(result.status===200&&result.data?.id===state.userId,'cookie restores original current user'); }
async function login(state) {
  const result=await call('/auth/login',{method:'POST',body:{email:state.email,password:state.password}});
  check(result.status===200&&result.data?.user?.id===state.userId,'login200 public user');
  const cookie=result.setCookie?.split(';')[0], opaque=cookie?.split('=')[1];
  check(/^[a-f0-9]{64}$/.test(opaque??''),'cookie256bit opaque');
  check(/HttpOnly/.test(result.setCookie??'')&&/SameSite=Lax/.test(result.setCookie??'')&&/Path=\//.test(result.setCookie??'')&&/Secure/.test(result.setCookie??''),'production cookie security attributes');
  const age=Number(/Max-Age=(\d+)/.exec(result.setCookie??'')?.[1]);
  check(age>0&&age<=604800&&/Expires=/.test(result.setCookie??''),'persistent cookie maximum absolute7d');
  return {...state,cookie,hash:sessionHash(opaque)};
}
async function initial() {
  const suffix=randomBytes(10).toString('hex'),state={email:`Bff-${suffix}@example.test`,password:randomBytes(24).toString('base64url')};
  for(const originValue of [null,'http://untrusted.test']){const denied=await call('/auth/register',{method:'POST',body:{...state,nickname:'BFF live'},originValue});check(denied.status===403&&denied.data?.code==='FORBIDDEN','mutation Origin missing/mismatch403');}
  const registered=await call('/auth/register',{method:'POST',body:{...state,nickname:'BFF live'}});
  check(registered.status===201&&registered.data?.user?.email===state.email,'register201 exact email public user');state.userId=registered.data.user.id;
  const current=await login(state);await assertIdentity(current);
  const stored=await row(current),tokens=decrypt(stored.encrypted_tokens,key,current.hash);
  check(!stored.encrypted_tokens.includes(tokens.accessToken)&&!stored.encrypted_tokens.includes(tokens.refreshToken),'PostgreSQL ciphertext excludes token plaintext');
  check(stored.session_hash!==current.cookie.split('=')[1]&&stored.session_hash.length===64,'session cookie hash-only lookup');
  const claims=JSON.parse(Buffer.from(tokens.accessToken.split('.')[1],'base64url').toString());current.sessionId=claims.sid;
  check(claims.exp-claims.iat===900,'real upstream access TTL900');current.deadline=stored.expires_at.toISOString();
  const board=await call('/boards',{method:'POST',cookie:current.cookie,body:{title:'BFF live validation'}});
  check(board.status===201&&board.data?.color==='#5534DA'&&!!board.etag,'board creation201 default/ETag');current.boardId=board.data.id;
  const boards=await call('/boards',{cookie:current.cookie});check(boards.status===200&&boards.data.items.some(b=>b.id===current.boardId&&b.myRole==='OWNER'),'boards membership/myRole real proxy');
  const bad=await call('/boards?cursor=invalid',{cookie:current.cookie});check(bad.status===422&&bad.data?.code==='INVALID_INPUT','invalid bookmark422 preserved');
  const countsBefore=Number((await pool.query('SELECT count(*) FROM refresh_credentials WHERE session_id=$1',[current.sessionId])).rows[0].count);
  // Authorized fixture-only time simulation. Do not change TTL/policy/product code.
  const timestamp=Math.floor(Date.now()/1000),expired={...claims,iat:timestamp-901,exp:timestamp-1};
  const header=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),payload=Buffer.from(JSON.stringify(expired)).toString('base64url');
  const signed=`${header}.${payload}.${createHmac('sha256',required('AUTH_JWT_SECRET')).update(`${header}.${payload}`).digest('base64url')}`;
  await pool.query('UPDATE web_sessions SET encrypted_tokens=$2 WHERE session_hash=$1 AND revoked_at IS NULL',[current.hash,encrypt({...tokens,accessToken:signed},key,current.hash)]);
  await Promise.all([assertIdentity(current,base),assertIdentity(current,second)]);
  const after=await row(current),countAfter=Number((await pool.query('SELECT count(*) FROM refresh_credentials WHERE session_id=$1',[current.sessionId])).rows[0].count);
  check(countAfter===countsBefore+1,'two production workers rotate refresh exactly once');
  check(after.expires_at.toISOString()===current.deadline&&after.revoked_at===null,'refresh retains absolute deadline and valid session');
  await save(current); console.log('INITIAL READY: encrypted fixture state saved; restart both BFF workers and BE before recovery phase');
}
async function recovery() {
  const state=await load();await assertIdentity(state);await assertIdentity(state,second);
  const stored=await row(state);check(stored.expires_at.toISOString()===state.deadline,'restart preserves PostgreSQL absolute deadline');
  const tokens=decrypt(stored.encrypted_tokens,key,state.hash);
  const loggedOut=await call('/auth/logout',{method:'POST',cookie:state.cookie});
  check(loggedOut.status===204&&/Max-Age=0/.test(loggedOut.setCookie??''),'logout204 clears persistent cookie');
  const denied=await call('/me',{cookie:state.cookie});check(denied.status===401&&denied.data?.code==='UNAUTHENTICATED','revoked BFF cookie immediately denied');
  const upstream=await fetch(`${required('TASKIFY_API_BASE')}/me`,{headers:{Authorization:`Bearer ${tokens.accessToken}`},signal:AbortSignal.timeout(10000)});
  check(upstream.status===401,'logout immediately rejects previously valid upstream access');
  check((await row(state)).revoked_at!==null,'local PostgreSQL revoked_at persisted');
  console.log('RECOVERY COMPLETE: fixture data retained; no reset/drop/delete performed');
}
try {
  const actual=(await pool.query('SELECT current_database() AS name, host(inet_server_addr()) AS address, inet_server_port() AS port')).rows[0];
  check(actual.name===dbName&&actual.port===55432&&['127.0.0.1','::1'].includes(actual.address),'isolated database exact name/loopback/port guard');
  if(phase==='initial')await initial();else if(phase==='recovery')await recovery();else throw new Error('Unknown harness phase');
  console.log(`Live BFF ${phase}: ${checks} checks passed (HTTP/PG, not browser visual/click acceptance)`);
} catch(error) { console.error(error.message?.startsWith('FAIL:')?error.message:'Live BFF harness failed; sensitive error details suppressed');process.exitCode=1; }
finally { await pool.end(); }
