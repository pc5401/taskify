// Cycle04: new browser fixtures and independent member/assignee HTTP checks.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const crypto = require('node:crypto');
if (process.argv.includes('--check')) { console.log('Cycle04 preparation only; no DB/HTTP calls.'); process.exit(0); }
const env = process.env;
assert.equal(env.TASKIFY_QA_CYCLE04_READY, 'approved-preserved-member-assignee');
const config = JSON.parse(fs.readFileSync(env.TASKIFY_LIVE_ENV_FILE,'utf8'));
const dbUrl = new URL(config.DATABASE_URL), api = new URL(config.TASKIFY_API_BASE), web = new URL(config.TASKIFY_LIVE_BFF_BASE || config.NEXT_APP_ORIGIN);
assert.equal(dbUrl.hostname,'127.0.0.1'); assert.equal(dbUrl.port,'55432'); assert.equal(dbUrl.pathname,'/taskify_validation');
for (const url of [api,web]) assert(['127.0.0.1','localhost'].includes(url.hostname) && !url.username && !url.password);
const { Pool } = require(env.TASKIFY_QA_PG_MODULE), jwt = require(env.TASKIFY_QA_JWT_MODULE);
const key = Buffer.from(config.TASKIFY_SESSION_KEY,'base64'); assert.equal(key.length,32);
const pool = new Pool({ connectionString: config.DATABASE_URL,connectionTimeoutMillis:5000,query_timeout:10000 });
const run=crypto.randomUUID(), prefix=`qa_member_${run.slice(0,8)}_`, results=[];
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
    await add('no-pred',0,active.id,null,users.owner.id);
    await add('blocked-active',1,active.id,predActive.id,users.editor.id,true);
    await add('unblocked',2,active.id,predDone.id);
    await add('blocked-done',3,done.id,predActive.id,users.viewer.id,true);
    await add('unblocked-done',4,done.id,predDone.id,users.editor.id);

    const tagId=crypto.randomUUID();await client.query('INSERT INTO tags(id,board_id,name) VALUES($1,$2,$3)',[tagId,ids.board,'Alpha']);
    for(const card of cards.filter(v=>v.tag))await client.query('INSERT INTO card_tags(card_id,tag_id,board_id) VALUES($1,$2,$3)',[card.id,tagId,ids.board]);
    ids.foreignCard=crypto.randomUUID();
    await client.query('INSERT INTO cards(id,board_id,column_id,title,creator_id,position,updated_at) VALUES($1,$2,$3,$4,$5,0,now())',[ids.foreignCard,ids.otherBoard,foreignColumn,prefix+'FOREIGN-SECRET',users.owner.id]);
    await client.query('COMMIT');
  } catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
  if(process.argv.includes('--fixture-only') || env.TASKIFY_QA_BROWSER_FIXTURE_FILE) {
    const requested=env.TASKIFY_QA_BROWSER_FIXTURE_FILE || path.join(__dirname,'.runtime','cycle04-browser.json');
    const fixtureFile=path.resolve(requested),allowed=path.resolve(__dirname,'.runtime')+path.sep;
    assert(fixtureFile.startsWith(allowed),'Browser fixture secrets must stay inside QA ignored runtime');
    fs.mkdirSync(path.dirname(fixtureFile),{recursive:true});
    fs.writeFileSync(fixtureFile,JSON.stringify({run,boardId:ids.board,otherBoardId:ids.otherBoard,columns,cards,users:Object.fromEntries(Object.entries(users).map(([role,user])=>[role,{id:user.id,email:user.email,password:user.password}]))}));
  }
}
async function create(base,body,user=users.owner){
  const browser=base===web,r=await fetch(base.toString().replace(/\/$/,'')+(browser?'/api':'')+`/columns/${columns[0].id}/cards`,{method:'POST',headers:{'Content-Type':'application/json',...(browser?{Origin:web.origin,Cookie:user.cookie}:{Authorization:`Bearer ${user.token}`})},body:JSON.stringify(body),redirect:'error',signal:AbortSignal.timeout(15000)});
  const data=await r.json();noSecrets(data);return {status:r.status,data,etag:r.headers.get('etag')};
}
function status(r,expected,code){assert.equal(r.status,expected);if(code)assert.equal(r.data.code,code);}
const memberPath=(base,board=ids.board)=>(base===web?'/api':'')+`/boards/${board}/members`;
function privateFree(data){noSecrets(data);assert(!/"(?:email|password|passwordHash|password_hash|session|encryptedTokens|encrypted_tokens)"/.test(JSON.stringify(data)));}
async function snapshot(){
  const output={};for(const table of ['cards','columns','tags','board_members'])output[table]=(await pool.query(`SELECT * FROM ${table} WHERE board_id=$1 ORDER BY ${table==='board_members'?'user_id':'id'}`,[ids.board])).rows;
  output.links=(await pool.query('SELECT * FROM card_tags WHERE board_id=$1 ORDER BY card_id,tag_id',[ids.board])).rows;
  output.activities=(await pool.query('SELECT a.* FROM activities a JOIN cards c ON c.id=a.card_id WHERE c.board_id=$1 ORDER BY a.id',[ids.board])).rows;return output;
}
async function unchanged(work){const initial=await snapshot();await work();assert.deepEqual(await snapshot(),initial);}
async function main(){
  assert.equal((await pool.query('SELECT current_database() AS name')).rows[0].name,'taskify_validation');await seed();assert.equal(cards.length,7);
  console.log(JSON.stringify({run,browserFixtureReady:process.argv.includes('--fixture-only')||!!env.TASKIFY_QA_BROWSER_FIXTURE_FILE,boardId:ids.board,cards:7}));
  if(process.argv.includes('--fixture-only'))return;
  for(const base of [api,web]){
    const label=base===api?'API':'BFF';
    await check(`${label} three member roles public projection ordered membership`,async()=>{
      await unchanged(async()=>{for(const role of ['owner','editor','viewer']){
        const r=await get(base,memberPath(base),users[role]);status(r,200);privateFree(r.data);
        const expected=(await pool.query('SELECT user_id,role,joined_at FROM board_members WHERE board_id=$1 ORDER BY joined_at,user_id',[ids.board])).rows;
        assert.deepEqual(r.data.items.map(v=>v.userId),expected.map(v=>v.user_id));
        for(let i=0;i<expected.length;i++){const item=r.data.items[i];assert.equal(item.role,expected[i].role);assert.equal(new Date(item.joinedAt).toISOString(),expected[i].joined_at.toISOString());assert(['userId','role','joinedAt','nickname'].every(key=>Object.keys(item).includes(key)));assert(Object.keys(item).every(key=>['userId','role','joinedAt','nickname'].includes(key)));assert.equal(item.nickname,'QA '+Object.keys(users).find(k=>users[k].id===item.userId));}
      }});
    });
    await check(`${label} nonmember missing malformed unauthenticated gates`,async()=>{
      await unchanged(async()=>{
        for(const role of ['outsider','pending'])status(await get(base,memberPath(base),users[role]),403,'NOT_MEMBER');
        status(await get(base,memberPath(base,ids.otherBoard),users.editor),403,'NOT_MEMBER');
        status(await get(base,memberPath(base,crypto.randomUUID()),users.owner),403,'NOT_MEMBER');
        status(await get(base,memberPath(base,'invalid-uuid'),users.owner),422,'INVALID_INPUT');
        status(await get(base,memberPath(base)),401,'UNAUTHENTICATED');
      });
    });
    await check(`${label} assigned create allowed and unassigned null`,async()=>{
      for(const role of ['owner','editor'])for(const assigneeId of [users.owner.id,users.editor.id,users.viewer.id,null]){
        const r=await create(base,{title:prefix+'assigned',assigneeId},users[role]);status(r,201);assert.equal(r.data.assigneeId,assigneeId);assert.equal(r.etag,`"${r.data.version}"`);
        const saved=(await pool.query('SELECT * FROM cards WHERE id=$1',[r.data.id])).rows[0];assert.equal(saved.assignee_id,assigneeId);assert.equal(saved.creator_id,users[role].id);
        assert.equal((await pool.query("SELECT count(*)::int AS n FROM activities WHERE card_id=$1 AND action='CARD_CREATED'",[r.data.id])).rows[0].n,1);
      }
    });
    await check(`${label} invalid assignee and Viewer rollback`,async()=>{
      await unchanged(async()=>{
        status(await create(base,{title:'denied',assigneeId:users.owner.id},users.viewer),403,'FORBIDDEN');
        status(await create(base,{title:'foreign',assigneeId:users.outsider.id,tagNames:['shouldrollback']}),422,'CROSS_BOARD');
        status(await create(base,{title:'missing',assigneeId:crypto.randomUUID()}),422,'INVALID_INPUT');
        status(await create(base,{title:'bad',assigneeId:'not-uuid'}),422,'INVALID_INPUT');
      });
    });
    await check(`${label} assignee filter AND and foreign empty`,async()=>{
      await unchanged(async()=>{
        const r=await get(base,cardPath(base,`?assigneeId=${users.editor.id}&columnId=${columns[0].id}&tag=Alpha`),users.viewer);status(r,200);assert.equal(r.data.items.length,1);assert.equal(r.data.items[0].id,cards.find(c=>c.name==='blocked-active').id);
        const empty=await get(base,cardPath(base,`?assigneeId=${users.outsider.id}`),users.owner);status(empty,200);assert.deepEqual(empty.data.items,[]);
      });
    });
  }
  await check('API BFF revoked and absolute expiry deny members',async()=>{
    await pool.query('UPDATE auth_sessions SET revoked_at=now() WHERE id=$1',[users.editor.sid]);
    await pool.query("UPDATE auth_sessions SET expires_at=now()-interval '1 second' WHERE id=$1",[users.viewer.sid]);
    await unchanged(async()=>{for(const base of [api,web])for(const role of ['editor','viewer'])status(await get(base,memberPath(base),users[role]),401,'UNAUTHENTICATED');});
  });
  console.log(JSON.stringify({run,passed:results.length,checks:results,fixturePreserved:true}));
}
main().catch(error=>{console.error(JSON.stringify({stage,passed:results.length,error:error.name,sqlstate:error.code||null}));process.exitCode=1;}).finally(()=>pool.end());
