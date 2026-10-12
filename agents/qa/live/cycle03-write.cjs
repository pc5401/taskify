// Cycle03: run-owned SQL fixtures and real card create/move HTTP requests.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const crypto = require('node:crypto');
if (process.argv.includes('--check')) { console.log('Cycle03 preparation only; no DB/HTTP calls.'); process.exit(0); }
const env = process.env;
assert.equal(env.TASKIFY_QA_CYCLE03_READY, 'approved-preserved-card-write');
const config = JSON.parse(fs.readFileSync(env.TASKIFY_LIVE_ENV_FILE,'utf8'));
const dbUrl = new URL(config.DATABASE_URL), api = new URL(config.TASKIFY_API_BASE), web = new URL(config.TASKIFY_LIVE_BFF_BASE || config.NEXT_APP_ORIGIN);
assert.equal(dbUrl.hostname,'127.0.0.1'); assert.equal(dbUrl.port,'55432'); assert.equal(dbUrl.pathname,'/taskify_validation');
for (const url of [api,web]) assert(['127.0.0.1','localhost'].includes(url.hostname) && !url.username && !url.password);
const { Pool } = require(env.TASKIFY_QA_PG_MODULE), jwt = require(env.TASKIFY_QA_JWT_MODULE);
const key = Buffer.from(config.TASKIFY_SESSION_KEY,'base64'); assert.equal(key.length,32);
const pool = new Pool({ connectionString: config.DATABASE_URL,connectionTimeoutMillis:5000,query_timeout:10000 });
const run=crypto.randomUUID(), prefix=`qa_write_${run}_`, results=[];
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
    for(let i=0;i<2;i++)await add(`page-${i}`,20+i,i%2?done.id:active.id);
    const tagId=crypto.randomUUID();await client.query('INSERT INTO tags(id,board_id,name) VALUES($1,$2,$3)',[tagId,ids.board,'Alpha']);
    for(const card of cards.filter(v=>v.tag))await client.query('INSERT INTO card_tags(card_id,tag_id,board_id) VALUES($1,$2,$3)',[card.id,tagId,ids.board]);
    ids.foreignCard=crypto.randomUUID();
    await client.query('INSERT INTO cards(id,board_id,column_id,title,creator_id,position,updated_at) VALUES($1,$2,$3,$4,$5,0,now())',[ids.foreignCard,ids.otherBoard,foreignColumn,prefix+'FOREIGN-SECRET',users.owner.id]);
    await client.query('COMMIT');
  } catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
  if(env.TASKIFY_QA_BROWSER_FIXTURE_FILE) {
    const fixtureFile=path.resolve(env.TASKIFY_QA_BROWSER_FIXTURE_FILE),allowed=path.resolve(__dirname,'.runtime')+path.sep;
    assert(fixtureFile.startsWith(allowed),'Browser fixture secrets must stay inside QA ignored runtime');
    fs.mkdirSync(path.dirname(env.TASKIFY_QA_BROWSER_FIXTURE_FILE),{recursive:true});
    fs.writeFileSync(env.TASKIFY_QA_BROWSER_FIXTURE_FILE,JSON.stringify({run,boardId:ids.board,missingBoardId:crypto.randomUUID(),viewer:{email:users.viewer.email,password:users.viewer.password},outsider:{email:users.outsider.email,password:users.outsider.password}}));
  }
}
async function post(base,suffix,user,body,version,origin=web.origin) {
  const browser=base===web,headers={'Content-Type':'application/json'};
  if(user)Object.assign(headers,browser?{Cookie:user.cookie}:{Authorization:`Bearer ${user.token}`});
  if(browser && origin!==null)headers.Origin=origin;
  if(version!==undefined)headers['If-Match']=String(version);
  const r=await fetch(base.toString().replace(/\/$/,'')+(browser?'/api':'')+suffix,{method:'POST',headers,body:JSON.stringify(body),redirect:'error',signal:AbortSignal.timeout(20000)});
  const raw=await r.text(); let data;try{data=JSON.parse(raw);}catch{throw Error('Non-JSON write response');}
  noSecrets(data);return {status:r.status,data,etag:r.headers.get('etag')};
}
const create=(base,column,body,user=users.owner)=>post(base,`/columns/${column}/cards`,user,body);
const move=(base,card,column,before=null,version='"1"',user=users.owner)=>post(base,`/cards/${card}/move`,user,{toColumnId:column,beforeCardId:before},version);
function status(r,value,code){assert.equal(r.status,value);if(code)assert.equal(r.data.code,code);}
async function snapshot(){
  const output={};for(const table of ['cards','columns','tags'])output[table]=(await pool.query(`SELECT * FROM ${table} WHERE board_id=$1 ORDER BY id`,[ids.board])).rows;
  output.links=(await pool.query('SELECT * FROM card_tags WHERE board_id=$1 ORDER BY card_id,tag_id',[ids.board])).rows;
  output.activities=(await pool.query('SELECT a.* FROM activities a JOIN cards c ON c.id=a.card_id WHERE c.board_id=$1 ORDER BY a.id',[ids.board])).rows;return output;
}
async function unchanged(work){const before=await snapshot();await work();assert.deepEqual(await snapshot(),before);}
async function newColumn(name,wip=null){const id=crypto.randomUUID();await pool.query('INSERT INTO columns(id,board_id,title,position,is_done,wip_limit) VALUES($1,$2,$3,1024,false,$4)',[id,ids.board,prefix+name,wip]);return id;}
async function seedCard(column,position,title='fixture'){
  const id=crypto.randomUUID();await pool.query('INSERT INTO cards(id,board_id,column_id,title,creator_id,position,updated_at) VALUES($1,$2,$3,$4,$5,$6,now())',[id,ids.board,column,prefix+title,users.owner.id,position]);return id;
}
async function row(id){return (await pool.query('SELECT * FROM cards WHERE id=$1',[id])).rows[0];}
async function activities(id){return (await pool.query('SELECT * FROM activities WHERE card_id=$1 ORDER BY id',[id])).rows;}
function publicCard(r){assert.equal(r.etag,`"${r.data.version}"`);for(const field of ['id','boardId','columnId','creatorId','position','version','blocked','warnings'])assert(field in r.data);}
async function main(){
  assert.equal((await pool.query('SELECT current_database() AS name')).rows[0].name,'taskify_validation');await seed();
  for(const base of [api,web]){
    const label=base===api?'API':'BFF',target=await newColumn(label+' target');
    await check(`${label} role auth and starting resource gates`,async()=>{
      await unchanged(async()=>{
        for(const role of ['viewer','outsider','pending']){
          status(await create(base,target,{title:'denied'},users[role]),403);
          status(await move(base,cards[0].id,target,null,'"1"',users[role]),403);
        }
        status(await create(base,crypto.randomUUID(),{title:'missing'}),403,'NOT_MEMBER');
        status(await move(base,crypto.randomUUID(),target),403,'NOT_MEMBER');
        status(await create(base,target,{title:'missing-auth'},null),401,'UNAUTHENTICATED');
      });
    });
    await check(`${label} validation crossboard and CAS headers preserve state`,async()=>{
      await unchanged(async()=>{
        for(const body of [{},{title:''},{title:'x'.repeat(121)},{title:3},{title:'x',assigneeId:users.outsider.id},{title:'x',predecessorId:crypto.randomUUID()}])status(await create(base,target,body),422);
        status(await create(base,'bad-id',{title:'bad'}),422,'INVALID_INPUT');
        status(await move(base,cards[0].id,ids.foreignColumn),422,'CROSS_BOARD');
        status(await create(base,target,{title:'foreign predecessor',predecessorId:ids.foreignCard}),422,'CROSS_BOARD');
        status(await move(base,cards[0].id,target,ids.foreignCard),422,'CROSS_BOARD');
        status(await move(base,cards[0].id,target,cards[0].id),422,'INVALID_INPUT');
        status(await post(base,`/cards/${cards[0].id}/move`,users.owner,{toColumnId:target}),428,'IF_MATCH_REQUIRED');
        for(const header of ['1','W/"1"','"0"','"1.0"'])status(await move(base,cards[0].id,target,null,header),422,'INVALID_INPUT');
        const stale=await move(base,cards[0].id,target,null,'"99"');status(stale,409,'VERSION_CONFLICT');assert.equal(stale.data.details.version,1);
      });
    });
    await check(`${label} create fields tags author ETag activity`,async()=>{
      for(const role of ['owner','editor']){
        const r=await create(base,target,{title:prefix+role,creatorId:users.outsider.id,description:'raw description',assigneeId:users.viewer.id,predecessorId:ids.predActive,dueAt:'2030-01-01T00:00:00.000Z',tagNames:['Alpha','alpha',' space ']},users[role]);status(r,201);publicCard(r);
        assert.equal(r.data.creatorId,users[role].id);assert.equal(r.data.blocked,true);assert.deepEqual(r.data.warnings,[]);
        const saved=await row(r.data.id);assert.equal(saved.creator_id,users[role].id);assert.equal(saved.description,'raw description');assert.equal(saved.assignee_id,users.viewer.id);assert.equal(saved.predecessor_id,ids.predActive);
        assert.equal((await pool.query('SELECT count(*)::int AS n FROM card_tags WHERE card_id=$1',[saved.id])).rows[0].n,2);
        const acts=await activities(saved.id);assert(acts.some(a=>a.action==='CARD_CREATED' && a.actor_id===users[role].id));assert(acts.every(a=>a.metadata!==null));
      }
      assert.equal((await pool.query("SELECT count(*)::int AS n FROM tags WHERE board_id=$1 AND lower(name)='alpha'",[ids.board])).rows[0].n,1);
      assert.equal((await pool.query("SELECT name FROM tags WHERE board_id=$1 AND lower(name)='alpha'",[ids.board])).rows[0].name,'Alpha');
    });
    await check(`${label} same-column full self exclusion and no-op`,async()=>{
      const full=await newColumn(label+' full',2),a=await seedCard(full,0),b=await seedCard(full,1024);
      await unchanged(async()=>{const r=await move(base,a,full,b);status(r,200);assert.equal(r.data.version,1);assert.equal(r.etag,'"1"');});
      const r=await move(base,b,full,a);status(r,200);publicCard(r);assert.equal(r.data.columnId,full);assert(r.data.version>1);
      await unchanged(async()=>status(await move(base,a,full),200));
    });
    await check(`${label} move blocked done warning and atomic activity`,async()=>{
      const r=await move(base,cards.find(c=>c.name==='blocked-active').id,columns[1].id,null,`"${(await row(cards.find(c=>c.name==='blocked-active').id)).version}"`);status(r,200);publicCard(r);assert.equal(r.data.blocked,true);assert.deepEqual(r.data.warnings,['BLOCKED_BY_PREDECESSOR']);
      const acts=await activities(r.data.id);assert(acts.some(a=>a.action==='CARD_MOVED'));assert(acts.every(a=>a.metadata!==null));
    });
  }
  for(const kind of ['create/create','create/move','move/move'])await check(`API WIP last slot concurrent ${kind}`,async()=>{
    const dest=await newColumn(kind,2);await seedCard(dest,0);const source=await newColumn('source '+kind),a=await seedCard(source,0),b=await seedCard(source,1024);
    const requests=kind==='create/create'?[()=>create(api,dest,{title:prefix+'wip1',tagNames:['wip1']}),()=>create(api,dest,{title:prefix+'wip2',tagNames:['wip2']})]:kind==='create/move'?[()=>create(api,dest,{title:prefix+'wip3',tagNames:['wip3']}),()=>move(api,a,dest)]:[()=>move(api,a,dest),()=>move(api,b,dest)];
    const responses=await Promise.all(requests.map(fn=>fn()));assert.equal(responses.filter(r=>r.status===200||r.status===201).length,1);assert.equal(responses.filter(r=>r.status===409&&r.data.code==='WIP_LIMIT_EXCEEDED').length,1);
    assert.equal((await pool.query('SELECT count(*)::int AS n FROM cards WHERE column_id=$1',[dest])).rows[0].n,2);
    for(const id of [a,b]){const saved=await row(id);if(saved.column_id===source){assert.equal(saved.version,1);assert.deepEqual(await activities(id),[]);}}
    for(let i=0;i<responses.length;i++)if(responses[i].status===409&&kind.split('/')[i]==='create')assert.equal((await pool.query('SELECT count(*)::int AS n FROM cards WHERE title=$1',[prefix+(kind==='create/create'?`wip${i+1}`:'wip3')])).rows[0].n,0);
  });
  await check('API same-card concurrent CAS one commit',async()=>{
    const source=await newColumn('cas source'),a=await seedCard(source,0),d1=await newColumn('cas1'),d2=await newColumn('cas2');
    const r=await Promise.all([move(api,a,d1),move(api,a,d2)]);assert.deepEqual(r.map(v=>v.status).sort(),[200,409]);assert.equal(r.find(v=>v.status===409).data.code,'VERSION_CONFLICT');assert.equal((await row(a)).version,2);assert.equal((await activities(a)).filter(v=>v.action==='CARD_MOVED').length,1);
  });
  await check('API tag concurrent creation reuses lower key',async()=>{
    const d1=await newColumn('tag1'),d2=await newColumn('tag2'),name='New'+run;
    const r=await Promise.all([create(api,d1,{title:'tag-one',tagNames:[name,name.toLowerCase()]}),create(api,d2,{title:'tag-two',tagNames:[name.toUpperCase()]})]);for(const result of r)status(result,201);
    const tags=(await pool.query('SELECT id,name FROM tags WHERE board_id=$1 AND lower(name)=lower($2)',[ids.board,name])).rows;assert.equal(tags.length,1);
    for(const result of r)assert.equal((await pool.query('SELECT count(*)::int AS n FROM card_tags WHERE card_id=$1 AND tag_id=$2',[result.data.id,tags[0].id])).rows[0].n,1);
  });
  await check('API gap and Int32 overflow destination rebalance versions',async()=>{
    for(const positions of [[0,1],[2147483647],[-2147483648]]){
      const dest=await newColumn('rebalance'),source=await newColumn('rebalance source'),existing=[];
      for(const pos of positions)existing.push(await seedCard(dest,pos));const moved=await seedCard(source,0),before=positions[0]===2147483647?null:existing[positions.length-1];
      const originals=await Promise.all(existing.map(row));const result=await move(api,moved,dest,before);status(result,200);
      const saved=(await pool.query('SELECT * FROM cards WHERE column_id=$1 ORDER BY position,id',[dest])).rows;
      assert(saved.every(c=>Number.isInteger(c.position)&&c.position>=-2147483648&&c.position<=2147483647));
      const sequence=existing.slice();sequence.splice(before===null?sequence.length:sequence.indexOf(before),0,moved);assert.deepEqual(saved.map(c=>c.id),sequence);
      for(const old of originals){const current=await row(old.id);if(current.position!==old.position)assert.equal(current.version,old.version+1);}
    }
  });
  await check('BFF Origin invalid does not write',async()=>{
    await unchanged(async()=>{for(const origin of [null,'http://wrong.invalid'])status(await post(web,`/columns/${columns[0].id}/cards`,users.owner,{title:'forbidden'},undefined,origin),403,'FORBIDDEN');});
  });
  await check('API activity failure rolls back create tags and move',async()=>{
    const name='qa03_'+run.replaceAll('-',''),dest=await newColumn('rollback'),source=await newColumn('rollback source'),title=prefix+'rollback',id=await seedCard(source,0,'rollback'),newTag='rollback_'+run;
    const otherActivities=(await pool.query('SELECT a.* FROM activities a JOIN cards c ON c.id=a.card_id WHERE c.board_id<>$1 ORDER BY a.id',[ids.board])).rows;
    assert(/^[a-z0-9_]+$/.test(name));assert(/^[a-zA-Z0-9_-]+$/.test(title));assert(/^[0-9a-f-]+$/.test(users.owner.id));
    let createdFunction=false,createdTrigger=false;
    try{
      await pool.query(`CREATE FUNCTION ${name}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.actor_id='${users.owner.id}'::uuid AND EXISTS(SELECT 1 FROM cards WHERE id=NEW.card_id AND board_id='${ids.board}'::uuid AND title='${title}') THEN RAISE EXCEPTION 'QA_ATOMIC_FIXTURE' USING ERRCODE='23514'; END IF; RETURN NEW; END $$`);createdFunction=true;
      await pool.query(`CREATE TRIGGER ${name} BEFORE INSERT ON activities FOR EACH ROW EXECUTE FUNCTION ${name}()`);createdTrigger=true;
      await unchanged(async()=>{const r=await create(api,dest,{title,tagNames:[newTag]});assert(r.status>=400,'Injected DB activity failure must not return success');});
      await unchanged(async()=>{const r=await move(api,id,dest);assert(r.status>=400,'Injected DB activity failure must not return success');});
      assert.equal((await pool.query('SELECT count(*)::int AS n FROM tags WHERE board_id=$1 AND name=$2',[ids.board,newTag])).rows[0].n,0);
      const unaffected=await create(api,dest,{title:prefix+'not-rollback'});status(unaffected,201);
      // Compare pre-existing records by ID; other simultaneous runs may append their own records.
      assert.deepEqual((await pool.query('SELECT * FROM activities WHERE id=ANY($1::uuid[]) ORDER BY id',[otherActivities.map(a=>a.id)])).rows,otherActivities);
    }finally{
      // Only exact UUID-owned objects are dropped, even when HTTP checks fail.
      if(createdTrigger)await pool.query(`DROP TRIGGER ${name} ON activities`);
      if(createdFunction)await pool.query(`DROP FUNCTION ${name}()`);
      assert.equal((await pool.query('SELECT count(*)::int AS n FROM pg_trigger WHERE tgname=$1',[name])).rows[0].n,0);
      assert.equal((await pool.query('SELECT count(*)::int AS n FROM pg_proc WHERE proname=$1',[name])).rows[0].n,0);
    }
    const recovery=await move(api,id,dest);status(recovery,200);assert.equal((await row(id)).column_id,dest);
  });
  await check('API BFF revoked and absolute-expired sessions cannot write',async()=>{
    await pool.query('UPDATE auth_sessions SET revoked_at=now() WHERE id=$1',[users.editor.sid]);
    await pool.query("UPDATE auth_sessions SET expires_at=now()-interval '1 second' WHERE id=$1",[users.owner.sid]);
    await unchanged(async()=>{for(const base of [api,web])for(const role of ['editor','owner']){
      status(await create(base,columns[0].id,{title:'invalid session'},users[role]),401,'UNAUTHENTICATED');
      status(await move(base,cards[0].id,columns[1].id,null,'"1"',users[role]),401,'UNAUTHENTICATED');
    }});
  });
  console.log(JSON.stringify({run,passed:results.length,checks:results,fixturePreserved:true}));
}
main().catch(error=>{console.error(JSON.stringify({stage,passed:results.length,error:error.name,sqlstate:error.code||null}));process.exitCode=1;}).finally(()=>pool.end());
