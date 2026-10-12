// Cycle02: SQL fixtures + real GET routes only. No product card create/move requests.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const crypto = require('node:crypto');
if (process.argv.includes('--check')) { console.log('Cycle02 preparation only; no DB/HTTP calls.'); process.exit(0); }
const env = process.env;
assert.equal(env.TASKIFY_QA_CYCLE02_READY, 'approved-preserved-read');
const config = JSON.parse(fs.readFileSync(env.TASKIFY_LIVE_ENV_FILE,'utf8'));
const dbUrl = new URL(config.DATABASE_URL), api = new URL(config.TASKIFY_API_BASE), web = new URL(config.TASKIFY_LIVE_BFF_BASE || config.NEXT_APP_ORIGIN);
assert.equal(dbUrl.hostname,'127.0.0.1'); assert.equal(dbUrl.port,'55432'); assert.equal(dbUrl.pathname,'/taskify_validation');
for (const url of [api,web]) assert(['127.0.0.1','localhost'].includes(url.hostname) && !url.username && !url.password);
const { Pool } = require(env.TASKIFY_QA_PG_MODULE), jwt = require(env.TASKIFY_QA_JWT_MODULE);
const key = Buffer.from(config.TASKIFY_SESSION_KEY,'base64'); assert.equal(key.length,32);
const pool = new Pool({ connectionString: config.DATABASE_URL,connectionTimeoutMillis:5000,query_timeout:10000 });
const run=crypto.randomUUID(), prefix=`qa_read_${run}_`, results=[];
const ids={board:crypto.randomUUID(),otherBoard:crypto.randomUUID()};
const users={},columns=[],cards=[];
let stage='setup';
const hash=v=>crypto.createHash('sha256').update(v).digest('hex');
const asc=(a,b)=>a.position-b.position || a.id.localeCompare(b.id);
function cipher(tokens,rowHash) {
  const iv=crypto.randomBytes(12), c=crypto.createCipheriv('aes-256-gcm',key,iv); c.setAAD(Buffer.from(rowHash));
  const body=Buffer.concat([c.update(JSON.stringify(tokens),'utf8'),c.final()]);return [iv,c.getAuthTag(),body].map(v=>v.toString('base64')).join('.');
}
async function get(base,suffix,user) {
  const browser=base===web;
  const response=await fetch(base.toString().replace(/\/$/,'')+suffix,{headers:user?(browser?{Cookie:user.cookie}:{Authorization:`Bearer ${user.token}`}):{},redirect:'error',cache:'no-store',signal:AbortSignal.timeout(15000)});
  const text=await response.text(); let data;try{data=text?JSON.parse(text):undefined;}catch{throw Error('Non-JSON read response');}
  return {status:response.status,data,headers:response.headers};
}
const basePath=base=>base===web?'/api/boards':'/boards';
const endpoints=base=>[`${basePath(base)}/${ids.board}`,`${basePath(base)}/${ids.board}/columns`,`${basePath(base)}/${ids.board}/cards`];
const cardPath=(base,query='')=>`${basePath(base)}/${ids.board}/cards${query}`;
function noSecrets(data) { const text=JSON.stringify(data);assert(!/passwordHash|password_hash|encrypted_tokens|refreshToken|accessToken|session_hash/.test(text)); }
async function check(name,work){stage=name;await work();results.push(name);console.log(`PASS ${name}`);}
async function seed() {
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    for(const role of ['owner','editor','viewer','outsider','pending']) {
      const id=crypto.randomUUID(),sid=crypto.randomUUID(),opaque=crypto.randomBytes(32).toString('hex'),iat=Math.floor(Date.now()/1000),password=crypto.randomBytes(18).toString('base64url'),salt=crypto.randomBytes(16);
      const passwordHash=`scrypt-v1$${salt.toString('hex')}$${crypto.scryptSync(password,salt,64,{N:16384,r:8,p:1,maxmem:64*1024*1024}).toString('hex')}`;
      const token=jwt.sign({sub:id,sid,iat,exp:iat+900},config.AUTH_JWT_SECRET,{algorithm:'HS256'}),refreshToken=crypto.randomBytes(32).toString('base64url'),rowHash=hash(opaque),expiry=new Date(Date.now()+7*86400000);
      users[role]={id,sid,token,cookie:`taskify_session=${opaque}`,email:`${role}${run}@example.test`,password};
      await client.query('INSERT INTO users(id,email,nickname,password_hash) VALUES($1,$2,$3,$4)',[id,users[role].email,`QA ${role}`,passwordHash]);
      await client.query('INSERT INTO auth_sessions(id,user_id,expires_at) VALUES($1,$2,$3)',[sid,id,expiry]);
      await client.query('INSERT INTO refresh_credentials(id,session_id,token_hash) VALUES($1,$2,$3)',[crypto.randomUUID(),sid,hash(refreshToken)]);
      await client.query('INSERT INTO web_sessions(id,session_hash,encrypted_tokens,expires_at) VALUES($1,$2,$3,$4)',[crypto.randomUUID(),rowHash,cipher({accessToken:token,refreshToken},rowHash),expiry]);
    }
    for(const [id,title] of [[ids.board,prefix+'main'],[ids.otherBoard,prefix+'other']]) {
      await client.query('INSERT INTO boards(id,title,updated_at) VALUES($1,$2,now())',[id,title]);
      await client.query("INSERT INTO board_members(board_id,user_id,role) VALUES($1,$2,'OWNER')",[id,users.owner.id]);
    }
    for(const role of ['editor','viewer']) await client.query('INSERT INTO board_members(board_id,user_id,role) VALUES($1,$2,$3)',[ids.board,users[role].id,role.toUpperCase()]);
    await client.query("INSERT INTO invitations(id,board_id,invitee_email,requested_role) VALUES($1,$2,$3,'VIEWER')",[crypto.randomUUID(),ids.board,users.pending.email]);
    for(const [title,position,done] of [['active',1024,false],['done',0,true],['tied',1024,false]]) {
      const row={id:crypto.randomUUID(),title:prefix+title,position,done};columns.push(row);
      await client.query('INSERT INTO columns(id,board_id,title,position,is_done) VALUES($1,$2,$3,$4,$5)',[row.id,ids.board,row.title,position,done]);
    }
    const foreignColumn=crypto.randomUUID();ids.foreignColumn=foreignColumn;
    await client.query("INSERT INTO columns(id,board_id,title,position,is_done) VALUES($1,$2,'QA foreign',0,true)",[foreignColumn,ids.otherBoard]);
    const active=columns[0],done=columns[1];
    const add=async(name,position,columnId,predecessorId=null,assigneeId=null,tag=false)=>{
      const card={id:crypto.randomUUID(),name,title:prefix+name,position,columnId,predecessorId,assigneeId,tag};cards.push(card);
      await client.query('INSERT INTO cards(id,board_id,column_id,title,creator_id,position,predecessor_id,assignee_id,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,now())',[card.id,ids.board,columnId,card.title,users.owner.id,position,predecessorId,assigneeId]);return card;
    };
    const predActive=await add('pred-active',10,active.id),predDone=await add('pred-done',11,done.id);
    ids.predActive=predActive.id;ids.predDone=predDone.id;
    await add('no-pred',0,active.id);
    await add('blocked-active',1,active.id,predActive.id,users.editor.id,true);
    await add('unblocked',2,active.id,predDone.id);
    await add('blocked-done',3,done.id,predActive.id,users.viewer.id,true);
    await add('unblocked-done',4,done.id,predDone.id);
    for(let i=0;i<25;i++)await add(`page-${i}`,20+Math.floor(i/2),i%2?done.id:active.id,null,i%2?users.viewer.id:users.editor.id);
    const tagId=crypto.randomUUID();await client.query('INSERT INTO tags(id,board_id,name) VALUES($1,$2,$3)',[tagId,ids.board,'Alpha']);
    for(const card of cards.filter(v=>v.tag))await client.query('INSERT INTO card_tags(card_id,tag_id,board_id) VALUES($1,$2,$3)',[card.id,tagId,ids.board]);
    await client.query('INSERT INTO cards(id,board_id,column_id,title,creator_id,position,updated_at) VALUES($1,$2,$3,$4,$5,0,now())',[crypto.randomUUID(),ids.otherBoard,foreignColumn,prefix+'FOREIGN-SECRET',users.owner.id]);
    await client.query('COMMIT');
  } catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
  if(env.TASKIFY_QA_BROWSER_FIXTURE_FILE) {
    const fixtureFile=path.resolve(env.TASKIFY_QA_BROWSER_FIXTURE_FILE),allowed=path.resolve(__dirname,'.runtime')+path.sep;
    assert(fixtureFile.startsWith(allowed),'Browser fixture secrets must stay inside QA ignored runtime');
    fs.mkdirSync(path.dirname(env.TASKIFY_QA_BROWSER_FIXTURE_FILE),{recursive:true});
    fs.writeFileSync(env.TASKIFY_QA_BROWSER_FIXTURE_FILE,JSON.stringify({run,boardId:ids.board,missingBoardId:crypto.randomUUID(),viewer:{email:users.viewer.email,password:users.viewer.password},outsider:{email:users.outsider.email,password:users.outsider.password}}));
  }
}
async function main() {
  assert.equal((await pool.query('SELECT current_database() AS name')).rows[0].name,'taskify_validation');
  await seed();
  const snapshot={board:(await pool.query('SELECT * FROM boards WHERE id=$1',[ids.board])).rows,
    columns:(await pool.query('SELECT * FROM columns WHERE board_id=$1 ORDER BY id',[ids.board])).rows,
    cards:(await pool.query('SELECT * FROM cards WHERE board_id=$1 ORDER BY id',[ids.board])).rows};
  for(const base of [api,web]) {
    const label=base===api?'API':'BFF';
    await check(`${label} three membership roles read Board/columns/cards and schemas`,async()=>{
      for(const role of ['owner','editor','viewer'])for(const suffix of endpoints(base)) {
        const response=await get(base,suffix,users[role]);assert.equal(response.status,200);noSecrets(response.data);
        if(suffix.endsWith('/columns')) {
          assert.deepEqual(response.data.items.map(v=>v.id),[...columns].sort(asc).map(v=>v.id));
          for(const col of response.data.items){assert.equal(col.boardId,ids.board);assert.equal(col.cards,undefined);for(const key of ['id','boardId','title','position','isDone','version'])assert(key in col);}
        } else if(suffix.endsWith('/cards')) {
          assert.equal(response.data.items.length,20);assert(response.data.nextCursor);
        } else {assert.equal(response.data.id,ids.board);assert.equal(response.headers.get('etag'),`"${response.data.version}"`);assert.equal(response.data.passwordHash,undefined);}
      }
    });
    await check(`${label} nonmember/pending/missing Board all forbidden without data`,async()=>{
      for(const user of [users.outsider,users.pending])for(const suffix of endpoints(base)) {const response=await get(base,suffix,user);assert.equal(response.status,403);assert.equal(response.data.code,'NOT_MEMBER');assert(!JSON.stringify(response.data).includes(prefix));}
      for(const ending of ['','/columns','/cards']){const response=await get(base,`${basePath(base)}/${crypto.randomUUID()}${ending}`,users.owner);assert.equal(response.status,403);assert.equal(response.data.code,'NOT_MEMBER');}
    });
    await check(`${label} path UUID/query/scalar repetitions validate 422`,async()=>{
      for(const ending of ['','/columns','/cards']){const response=await get(base,`${basePath(base)}/not-uuid${ending}`,users.owner);assert.equal(response.status,422);assert.equal(response.data.code,'INVALID_INPUT');}
      for(const query of ['?columnId=bad','?assigneeId=bad','?limit=0','?limit=101','?limit=1.2','?cursor=broken','?tag=Alpha&tag=Beta','?columnId='+columns[0].id+'&columnId='+columns[1].id,'?limit=1&limit=2']){const response=await get(base,cardPath(base,query),users.owner);assert.equal(response.status,422);assert.equal(response.data.code,'INVALID_INPUT');}
    });
    await check(`${label} card schema/computed blocked/warnings/board boundary`,async()=>{
      const response=await get(base,cardPath(base,'?limit=100'),users.owner);assert.equal(response.status,200);assert.equal(response.data.nextCursor,null);
      assert.deepEqual(response.data.items.map(v=>v.id),[...cards].sort(asc).map(v=>v.id));
      for(const card of response.data.items){assert.equal(card.boardId,ids.board);assert.equal(card.completed,undefined);for(const key of ['id','boardId','columnId','title','position','blocked','warnings','version','createdAt','updatedAt'])assert(key in card);}
      for(const [name,blocked,warnings]of [['no-pred',false,[]],['blocked-active',true,[]],['unblocked',false,[]],['blocked-done',true,['BLOCKED_BY_PREDECESSOR']],['unblocked-done',false,[]]]){const card=response.data.items.find(v=>v.id===cards.find(c=>c.name===name).id);assert.equal(card.blocked,blocked);assert.deepEqual(card.warnings,warnings);}
      assert(response.data.items.find(v=>v.id===cards.find(c=>c.name==='blocked-active').id).tagNames.includes('Alpha'));noSecrets(response.data);
    });
    await check(`${label} filters AND/exact tag/foreign valid empty`,async()=>{
      const target=cards.find(c=>c.name==='blocked-active');
      const query=`?columnId=${columns[0].id}&assigneeId=${users.editor.id}&tag=Alpha&limit=100`;
      const match=await get(base,cardPath(base,query),users.owner);assert.equal(match.status,200);assert.deepEqual(match.data.items.map(v=>v.id),[target.id]);
      for(const query of ['?tag=alpha','?tag=%20Alpha%20','?tag=','?columnId='+ids.foreignColumn,'?columnId='+crypto.randomUUID(),'?assigneeId='+users.outsider.id,'?assigneeId='+crypto.randomUUID()]){const response=await get(base,cardPath(base,query),users.owner);assert.equal(response.status,200);assert.deepEqual(response.data,{items:[],nextCursor:null});}
    });
    await check(`${label} all keyset pages have global stable tie ordering`,async()=>{
      const collected=[];let cursor=null,pages=0;
      do {const query=new URLSearchParams({limit:'3'});if(cursor)query.set('cursor',cursor);const response=await get(base,cardPath(base,'?'+query),users.owner);assert.equal(response.status,200);assert(response.data.items.length<=3);collected.push(...response.data.items.map(v=>v.id));cursor=response.data.nextCursor;assert(++pages<30);}while(cursor!==null);
      assert.deepEqual(collected,[...cards].sort(asc).map(v=>v.id));assert.equal(new Set(collected).size,cards.length);
    });
    await check(`${label} cursor bound to board and effective filters`,async()=>{
      const page=await get(base,cardPath(base,'?tag=Alpha&limit=1'),users.owner);assert(page.data.nextCursor);
      for(const suffix of [cardPath(base,'?cursor='+encodeURIComponent(page.data.nextCursor)),`${basePath(base)}/${ids.otherBoard}/cards?tag=Alpha&cursor=${encodeURIComponent(page.data.nextCursor)}`,cardPath(base,`?tag=Alpha&columnId=${columns[0].id}&cursor=${encodeURIComponent(page.data.nextCursor)}`)]){const response=await get(base,suffix,users.owner);assert.equal(response.status,422);assert.equal(response.data.code,'INVALID_INPUT');}
    });
  }
  await check('actual fixture anchor deletion still follows stored position/id boundary',async()=>{
    const first=await get(api,cardPath(api,'?limit=1'),users.owner),anchor=first.data.items[0].id;
    const expected=[...cards].sort(asc)[1].id;
    // New run-owned disposable anchor only, not preexisting user data.
    await pool.query('DELETE FROM cards WHERE id=$1 AND board_id=$2 AND title LIKE $3',[anchor,ids.board,prefix+'%']);
    const next=await get(api,cardPath(api,'?limit=1&cursor='+encodeURIComponent(first.data.nextCursor)),users.owner);assert.equal(next.status,200);assert.equal(next.data.items[0].id,expected);
    cards.splice(cards.findIndex(v=>v.id===anchor),1);
  });
  await check('computed fields recompute after direct predecessor fixture column change',async()=>{
    const target=cards.find(c=>c.name==='blocked-active'),before=(await pool.query('SELECT version,updated_at FROM cards WHERE id=$1',[target.id])).rows[0];
    await pool.query('UPDATE cards SET column_id=$2 WHERE id=$1 AND board_id=$3',[ids.predActive,columns[1].id,ids.board]);
    try {for(const base of [api,web]){const response=await get(base,cardPath(base,'?limit=100'),users.owner);assert.equal(response.data.items.find(v=>v.id===target.id).blocked,false);assert.deepEqual(response.data.items.find(v=>v.id===cards.find(c=>c.name==='blocked-done').id).warnings,[]);}}
    finally{await pool.query('UPDATE cards SET column_id=$2 WHERE id=$1 AND board_id=$3',[ids.predActive,columns[0].id,ids.board]);}
    assert.deepEqual((await pool.query('SELECT version,updated_at FROM cards WHERE id=$1',[target.id])).rows[0],before);
    const computedColumns=(await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='cards' AND column_name IN ('blocked','warnings','completed')")).rows;assert.equal(computedColumns.length,0);
  });
  await check('session revocation denies every read while other login stays valid',async()=>{
    await pool.query('UPDATE auth_sessions SET revoked_at=now() WHERE id=$1 AND user_id=$2',[users.editor.sid,users.editor.id]);
    for(const base of [api,web])for(const suffix of endpoints(base)){const response=await get(base,suffix,users.editor);assert.equal(response.status,401);assert.equal(response.data.code,'UNAUTHENTICATED');assert.equal((await get(base,suffix,users.owner)).status,200);}
    for(const suffix of endpoints(api))assert.equal((await get(api,suffix)).status,401);
  });
  await check('tampered/expired JWT and absolute session expiry denied on every read',async()=>{
    const oldIat=Math.floor(Date.now()/1000)-1800,expired=jwt.sign({sub:users.owner.id,sid:users.owner.sid,iat:oldIat,exp:oldIat+900},config.AUTH_JWT_SECRET,{algorithm:'HS256'});
    for(const token of ['not-a-jwt',expired])for(const suffix of endpoints(api)){const response=await get(api,suffix,{...users.owner,token});assert.equal(response.status,401);assert.equal(response.data.code,'UNAUTHENTICATED');}
    await pool.query("UPDATE auth_sessions SET expires_at=now()-interval '1 second' WHERE id=$1 AND user_id=$2",[users.viewer.sid,users.viewer.id]);
    for(const base of [api,web])for(const suffix of endpoints(base)){const response=await get(base,suffix,users.viewer);assert.equal(response.status,401);assert.equal(response.data.code,'UNAUTHENTICATED');}
  });
  await check('read operations preserve board/columns/cards excluding approved fixture edits',async()=>{
    assert.deepEqual((await pool.query('SELECT * FROM boards WHERE id=$1',[ids.board])).rows,snapshot.board);
    assert.deepEqual((await pool.query('SELECT * FROM columns WHERE board_id=$1 ORDER BY id',[ids.board])).rows,snapshot.columns);
    const retained=new Set(cards.map(v=>v.id));assert.deepEqual((await pool.query('SELECT * FROM cards WHERE board_id=$1 ORDER BY id',[ids.board])).rows,snapshot.cards.filter(v=>retained.has(v.id)));
  });
  console.log(`Cycle02 completed: ${results.length} real GET/SQL checks; fixture ${run}. No card create/move API or browser interaction claimed.`);
}
main().catch(error=>{console.error(`FAIL ${stage}: ${error.code||error.name}; sensitive details withheld`);process.exitCode=1;}).finally(()=>pool.end());
