// QA-only live harness. Never installs/starts/resets PostgreSQL or application servers.
const assert = require('node:assert/strict');
const { randomUUID, createHash, createCipheriv, createDecipheriv } = require('node:crypto');
const readline = require('node:readline/promises');
if (process.argv.includes('--check')) { console.log('Harness syntax/preparation only; no DB/HTTP calls.'); process.exit(0); }
const env = process.env;
assert.equal(env.TASKIFY_QA_LIVE_READY, 'approved-isolated-vs1', 'Wait for parent isolated live readiness');
const dbUrl = new URL(env.TASKIFY_QA_LIVE_DATABASE_URL);
const api = new URL(env.TASKIFY_QA_API), web = new URL(env.TASKIFY_QA_BFF);
for (const url of [dbUrl, api, web]) assert(['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname), 'Loopback only');
for (const url of [api, web]) assert(!url.username && !url.password && !url.search && !url.hash);
assert(env.TASKIFY_QA_EXPECT_DATABASE, 'Explicit isolated database name required');
const { Pool } = require(env.TASKIFY_QA_PG_MODULE);
const jwt = require(env.TASKIFY_QA_JWT_MODULE);
const key = Buffer.from(env.TASKIFY_QA_SESSION_KEY || '', 'base64'); assert.equal(key.length, 32);
assert(Buffer.byteLength(env.TASKIFY_QA_JWT_SECRET || '') >= 32);
const pool = new Pool({ connectionString: dbUrl.toString(), connectionTimeoutMillis: 5000, query_timeout: 10000 });
const run = randomUUID().replaceAll('-', ''), prefix = `qa_vs1_${run}_`;
const password = `QA-${randomUUID()}`, email = `Case${run}@example.test`;
const results = [];
const hash = value => createHash('sha256').update(value).digest('hex');
function encode(tokens, rowHash) {
  const iv = require('node:crypto').randomBytes(12), cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(rowHash));
  const body = Buffer.concat([cipher.update(JSON.stringify(tokens), 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), body].map(v => v.toString('base64')).join('.');
}
function decode(value, rowHash) {
  const [iv, tag, body] = value.split('.').map(v => Buffer.from(v, 'base64'));
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAAD(Buffer.from(rowHash)); decipher.setAuthTag(tag);
  return JSON.parse(Buffer.concat([decipher.update(body), decipher.final()]).toString('utf8'));
}
async function http(base, path, method = 'GET', body, headers = {}) {
  const response = await fetch(base.toString().replace(/\/$/, '') + path, {
    method, headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }), redirect: 'error', signal: AbortSignal.timeout(15000),
  });
  const text = await response.text();
  return { status: response.status, headers: response.headers, data: text ? JSON.parse(text) : undefined };
}
const bearer = tokens => ({ Authorization: `Bearer ${tokens.accessToken}` });
let currentCheck = 'setup';
async function check(name, work) { currentCheck = name; await work(); results.push(name); console.log(`PASS ${name}`); }
function publicUser(user) { assert.deepEqual(Object.keys(user).sort(), ['avatarUrl','createdAt','email','id','nickname']); }
function bundle(data) { assert.deepEqual(Object.keys(data).sort(), ['accessToken','refreshToken','user']); publicUser(data.user); }
async function expectedSqlError(work, code) {
  const client = await pool.connect();
  try { await client.query('BEGIN'); await assert.rejects(() => work(client), error => error.code === code); }
  finally { await client.query('ROLLBACK'); client.release(); }
}
async function createBoard(tokens, title) {
  const response = await http(api, '/boards', 'POST', { title }, bearer(tokens));
  assert.equal(response.status, 201); assert.equal(response.headers.get('etag'), `"${response.data.version}"`);
  return response.data;
}
async function main() {
  const database = (await pool.query('SELECT current_database() AS name')).rows[0].name;
  assert.equal(database, env.TASKIFY_QA_EXPECT_DATABASE);
  await check('live schema contains approved durable session columns', async () => {
    for (const [table, expected] of Object.entries({
      auth_sessions: ['id','user_id','created_at','expires_at','revoked_at'],
      refresh_credentials: ['id','session_id','token_hash','created_at','consumed_at'],
      web_sessions: ['id','session_hash','encrypted_tokens','expires_at','revoked_at','created_at'],
    })) {
      const columns = (await pool.query("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1", [table])).rows.map(v => v.column_name);
      assert.deepEqual(columns.sort(), expected.sort());
    }
  });
  let first, second, board, bffCookie, bffHash, outsiderUserId;
  await check('HTTP DTO and exact email registration/login/public projection', async () => {
    assert.equal((await http(api, '/auth/register', 'POST', { email, password: 'short', nickname: 'QA' })).status, 422);
    const registered = await http(api, '/auth/register', 'POST', { email, password, nickname: 'QA' }); assert.equal(registered.status, 201);
    bundle(registered.data); first = registered.data;
    const duplicate = await http(api, '/auth/register', 'POST', { email, password, nickname: 'QA' }); assert.equal(duplicate.status, 409); assert.equal(duplicate.data.code, 'EMAIL_TAKEN');
    const lower = await http(api, '/auth/login', 'POST', { email: email.toLowerCase(), password }); assert.equal(lower.status, 401); assert.equal(lower.data.code, 'INVALID_CREDENTIALS');
    assert.equal((await http(api, '/auth/login', 'POST', { email: ` ${email} `, password })).status, 422);
    const logged = await http(api, '/auth/login', 'POST', { email, password }); assert.equal(logged.status, 200); bundle(logged.data); second = logged.data;
    const stored = (await pool.query('SELECT email,password_hash FROM users WHERE id=$1', [first.user.id])).rows[0]; assert.equal(stored.email, email); assert(!stored.password_hash.includes(password));
  });
  await check('refresh history/non-extension/reuse persisted revocation and other session isolation', async () => {
    const sid = jwt.decode(first.accessToken).sid;
    const before = (await pool.query('SELECT created_at,expires_at FROM auth_sessions WHERE id=$1', [sid])).rows[0];
    assert.equal(before.expires_at - before.created_at, 7 * 86400000);
    assert.equal(jwt.decode(first.accessToken).exp - jwt.decode(first.accessToken).iat, 900);
    const rotated = await http(api, '/auth/refresh', 'POST', { refreshToken: first.refreshToken }); assert.equal(rotated.status, 200); bundle(rotated.data);
    const after = (await pool.query('SELECT expires_at FROM auth_sessions WHERE id=$1', [sid])).rows[0]; assert.equal(+after.expires_at, +before.expires_at);
    const history = (await pool.query('SELECT token_hash,consumed_at FROM refresh_credentials WHERE session_id=$1', [sid])).rows;
    assert.equal(history.length, 2); assert(history.some(v => v.token_hash === hash(first.refreshToken) && v.consumed_at));
    const reused = await http(api, '/auth/refresh', 'POST', { refreshToken: first.refreshToken }); assert.equal(reused.status, 401);
    assert((await pool.query('SELECT revoked_at FROM auth_sessions WHERE id=$1', [sid])).rows[0].revoked_at);
    assert.equal((await http(api, '/me', 'GET', undefined, bearer(rotated.data))).status, 401);
    assert.equal((await http(api, '/me', 'GET', undefined, bearer(second))).status, 200);
  });
  await check('board creation persisted defaults/OWNER and membership filtering', async () => {
    board = await createBoard(second, `${prefix}first`); assert.equal(board.color, '#5534DA'); assert.equal(board.myRole, undefined);
    const cols = (await pool.query('SELECT title,position,is_done FROM columns WHERE board_id=$1 ORDER BY position', [board.id])).rows;
    assert.deepEqual(cols, [{ title:'할 일',position:0,is_done:false },{ title:'하는 중',position:1024,is_done:false },{ title:'완료',position:2048,is_done:true }]);
    assert.equal((await pool.query('SELECT role FROM board_members WHERE board_id=$1 AND user_id=$2',[board.id,first.user.id])).rows[0].role,'OWNER');
    const page = await http(api, '/boards', 'GET', undefined, bearer(second)); assert.equal(page.status, 200); assert.equal(page.data.items.find(v => v.id === board.id).myRole,'OWNER');
    const stranger = await http(api, '/auth/register', 'POST',{ email:`other${run}@example.test`,password,nickname:'Other' }); assert.equal(stranger.status,201); outsiderUserId = stranger.data.user.id;
    const outsiderPage = await http(api,'/boards','GET',undefined,bearer(stranger.data)); assert(!outsiderPage.data.items.some(v=>v.id===board.id));
  });
  await check('keyset real ordering and deleted run anchor continues', async () => {
    const boards = [board, await createBoard(second, `${prefix}second`), await createBoard(second, `${prefix}third`)];
    const boundaryTime = Date.now() - 10000;
    for (let index = 0; index < boards.length; index++) await pool.query('UPDATE board_members SET joined_at=$3 WHERE board_id=$1 AND user_id=$2',[boards[index].id,first.user.id,new Date(boundaryTime-index*1000)]);
    const initial = await http(api,'/boards?limit=1','GET',undefined,bearer(second)); assert.equal(initial.data.items[0].id,boards[0].id); assert(initial.data.nextCursor);
    // Remove only this run's membership anchor and restore it; preserve fixture boards.
    const membership = (await pool.query('SELECT * FROM board_members WHERE board_id=$1 AND user_id=$2',[boards[0].id,first.user.id])).rows[0];
    await pool.query("INSERT INTO board_members(board_id,user_id,role) VALUES($1,$2,'OWNER')",[boards[0].id,outsiderUserId]);
    try {
      await pool.query('DELETE FROM board_members WHERE board_id=$1 AND user_id=$2',[boards[0].id,first.user.id]);
      const next = await http(api,`/boards?limit=1&cursor=${encodeURIComponent(initial.data.nextCursor)}`,'GET',undefined,bearer(second)); assert.equal(next.status,200); assert.equal(next.data.items[0].id,boards[1].id);
    } finally {
      await pool.query('INSERT INTO board_members(board_id,user_id,role,joined_at) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',[membership.board_id,membership.user_id,membership.role,membership.joined_at]);
    }
    // Parent explicitly authorized deletion of this new run-owned anchor fixture only.
    await pool.query('DELETE FROM boards WHERE id=$1 AND title=$2',[boards[0].id,`${prefix}first`]);
    const deleted = await http(api,`/boards?limit=1&cursor=${encodeURIComponent(initial.data.nextCursor)}`,'GET',undefined,bearer(second)); assert.equal(deleted.status,200); assert.equal(deleted.data.items[0].id,boards[1].id);
    const newest = await createBoard(second, `${prefix}new-participation`);
    const refresh = await http(api,'/boards?limit=1','GET',undefined,bearer(second)); assert.equal(refresh.data.items[0].id,newest.id);
    const existingCursor = await http(api,`/boards?limit=1&cursor=${encodeURIComponent(initial.data.nextCursor)}`,'GET',undefined,bearer(second)); assert.equal(existingCursor.data.items[0].id,boards[1].id);
    assert.equal((await http(api,'/boards?cursor=broken','GET',undefined,bearer(second))).status,422);
    board = boards[1];
  });
  await check('real board creation rollback under run-scoped failure injection', async () => {
    const functionName = `qa_fail_${run}`, triggerName = `qa_fail_${run}`;
    try {
      await pool.query(`CREATE FUNCTION ${functionName}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF EXISTS (SELECT 1 FROM boards WHERE id=NEW.board_id AND title='${prefix}rollback') THEN RAISE EXCEPTION 'QA injected failure' USING ERRCODE='23514'; END IF; RETURN NEW; END; $$`);
      await pool.query(`CREATE TRIGGER ${triggerName} BEFORE INSERT ON board_members FOR EACH ROW EXECUTE FUNCTION ${functionName}()`);
      const failed = await http(api,'/boards','POST',{title:`${prefix}rollback`},bearer(second)); assert(failed.status >= 400);
      assert.equal((await pool.query('SELECT count(*)::int AS count FROM boards WHERE title=$1',[`${prefix}rollback`])).rows[0].count,0);
    } finally { await pool.query(`DROP TRIGGER IF EXISTS ${triggerName} ON board_members`); await pool.query(`DROP FUNCTION IF EXISTS ${functionName}()`); }
  });
  await check('actual deferred owner trigger / WIP CHECK / cross-board FK / self predecessor', async () => {
    await expectedSqlError(async client => { await client.query('INSERT INTO boards(id,title,updated_at) VALUES($1,$2,now())',[randomUUID(),`${prefix}ownerless`]); await client.query('SET CONSTRAINTS ALL IMMEDIATE'); },'23514');
    await expectedSqlError(async client => { await client.query("UPDATE board_members SET role='VIEWER' WHERE board_id=$1 AND user_id=$2",[board.id,first.user.id]); await client.query('SET CONSTRAINTS ALL IMMEDIATE'); },'23514');
    await expectedSqlError(client => client.query('INSERT INTO columns(id,board_id,title,position,wip_limit) VALUES($1,$2,$3,0,0)',[randomUUID(),board.id,'invalid']),'23514');
    const other = await createBoard(second,`${prefix}fk-other`), column = (await pool.query('SELECT id FROM columns WHERE board_id=$1 ORDER BY position LIMIT 1',[other.id])).rows[0].id;
    await expectedSqlError(client => client.query('INSERT INTO cards(id,board_id,column_id,title,creator_id,position,updated_at) VALUES($1,$2,$3,$4,$5,0,now())',[randomUUID(),board.id,column,'cross',first.user.id]),'23503');
    const ownCol = (await pool.query('SELECT id FROM columns WHERE board_id=$1 ORDER BY position LIMIT 1',[board.id])).rows[0].id, self=randomUUID();
    await expectedSqlError(client => client.query('INSERT INTO cards(id,board_id,column_id,title,creator_id,predecessor_id,position,updated_at) VALUES($1,$2,$3,$4,$5,$1,0,now())',[self,board.id,ownCol,'self',first.user.id]),'23514');
  });
  await check('BFF Origin,opaque persistent cookie,PG hash/GCM storage,no token JSON', async () => {
    const input={email,password};
    for (const headers of [{},{Origin:'https://invalid.example'}]) { const rejected=await http(web,'/api/auth/login','POST',input,headers); assert.equal(rejected.status,403); assert.equal(rejected.data.code,'FORBIDDEN'); }
    const login=await http(web,'/api/auth/login','POST',input,{Origin:web.origin}); assert.equal(login.status,200); assert.deepEqual(Object.keys(login.data),['user']);
    const setCookie=login.headers.get('set-cookie'); assert.match(setCookie,/HttpOnly/);assert.match(setCookie,/SameSite=Lax/);assert.match(setCookie,/Path=\//);assert.match(setCookie,/Max-Age=\d+/);assert.match(setCookie,/Expires=/);
    bffCookie=setCookie.split(';')[0];const opaque=bffCookie.split('=')[1];assert.match(opaque,/^[a-f0-9]{64}$/);bffHash=hash(opaque);
    const row=(await pool.query('SELECT * FROM web_sessions WHERE session_hash=$1',[bffHash])).rows[0];assert(row);const tokens=decode(row.encrypted_tokens,bffHash);assert(!row.encrypted_tokens.includes(tokens.refreshToken));assert(!row.encrypted_tokens.includes(tokens.accessToken));assert.throws(()=>decode(row.encrypted_tokens,'wrong-row'));
    const me=await http(web,'/api/me','GET',undefined,{Cookie:bffCookie});assert.equal(me.status,200);publicUser(me.data);
  });
  await check('BFF concurrent expired access requests rotate once under actual PG row lock', async () => {
    const row=(await pool.query('SELECT * FROM web_sessions WHERE session_hash=$1',[bffHash])).rows[0],tokens=decode(row.encrypted_tokens,bffHash),claims=jwt.decode(tokens.accessToken);
    const countBefore=(await pool.query('SELECT count(*)::int AS count FROM refresh_credentials WHERE session_id=$1',[claims.sid])).rows[0].count;
    const iat=Math.floor(Date.now()/1000)-1800;tokens.accessToken=jwt.sign({sub:claims.sub,sid:claims.sid,iat,exp:iat+900},env.TASKIFY_QA_JWT_SECRET,{algorithm:'HS256'});
    await pool.query('UPDATE web_sessions SET encrypted_tokens=$2 WHERE session_hash=$1',[bffHash,encode(tokens,bffHash)]);
    const responses=await Promise.all(Array.from({length:4},()=>http(web,'/api/me','GET',undefined,{Cookie:bffCookie})));assert(responses.every(v=>v.status===200));
    const countAfter=(await pool.query('SELECT count(*)::int AS count FROM refresh_credentials WHERE session_id=$1',[claims.sid])).rows[0].count;assert.equal(countAfter,countBefore+1);
    const current=(await pool.query('SELECT * FROM web_sessions WHERE session_hash=$1',[bffHash])).rows[0];assert.equal(+current.expires_at,+row.expires_at);assert.equal(current.revoked_at,null);
  });
  if(process.argv.includes('--restart-check')) {
    console.log('CHECKPOINT: parent restart BE/BFF, then send newline; cookie remains memory-only.');
    const input=readline.createInterface({input:process.stdin,output:process.stdout});await input.question('');input.close();
    await check('same cookie after parent BE/BFF restart',async()=>{assert.equal((await http(web,'/api/me','GET',undefined,{Cookie:bffCookie})).status,200);});
  }
  await check('BFF logout clears cookie and persists local/upstream current revocation',async()=>{
    const row=(await pool.query('SELECT * FROM web_sessions WHERE session_hash=$1',[bffHash])).rows[0],tokens=decode(row.encrypted_tokens,bffHash),sid=jwt.decode(tokens.accessToken).sid;
    const logout=await http(web,'/api/auth/logout','POST',undefined,{Cookie:bffCookie,Origin:web.origin});assert.equal(logout.status,204);assert.match(logout.headers.get('set-cookie'),/Max-Age=0/);
    assert((await pool.query('SELECT revoked_at FROM web_sessions WHERE session_hash=$1',[bffHash])).rows[0].revoked_at);assert((await pool.query('SELECT revoked_at FROM auth_sessions WHERE id=$1',[sid])).rows[0].revoked_at);
    assert.equal((await http(api,'/me','GET',undefined,bearer(tokens))).status,401);assert.equal((await http(api,'/me','GET',undefined,bearer(second))).status,200);
  });
  await check('absolute expiry DB boundary rejects access and refresh without rotation',async()=>{
    const login=await http(api,'/auth/login','POST',{email,password});assert.equal(login.status,200);const sid=jwt.decode(login.data.accessToken).sid;
    await pool.query("UPDATE auth_sessions SET expires_at=now()-interval '1 second' WHERE id=$1 AND user_id=$2",[sid,first.user.id]);
    assert.equal((await http(api,'/me','GET',undefined,bearer(login.data))).status,401);assert.equal((await http(api,'/auth/refresh','POST',{refreshToken:login.data.refreshToken})).status,401);
    assert.equal((await pool.query('SELECT count(*)::int AS count FROM refresh_credentials WHERE session_id=$1',[sid])).rows[0].count,1);
  });
  console.log(`VS1 live checks completed: ${results.length}; fixture run ${run}. Real browser/Figma and business QA001~013 unexecuted.`);
}
main().catch(error=>{ console.error(`FAIL ${currentCheck}: ${error.code || error.name}; details withheld to avoid secret leakage`);process.exitCode=1; }).finally(()=>pool.end());
