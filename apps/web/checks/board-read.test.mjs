import test from 'node:test';
import assert from 'node:assert/strict';
import { Bff } from '../src/server/bff.ts';
import { readTarget } from '../src/server/read-target.ts';
import { parseBoardFilters } from '../src/board-filters.ts';
import { createBrowserApi, CardPaginationError } from '../src/browser-api.ts';
import { encrypt, sessionHash } from '../src/server/crypto.ts';
const id='00000000-0000-4000-8000-000000000001',other='00000000-0000-4000-8000-000000000002';
const path=`/boards/${id}`,key=Buffer.alloc(32,5),cookie='b'.repeat(64),hash=sessionHash(cookie);

test('UI and BFF reject non-digit raw limits before numeric conversion',()=>{
 for(const value of ['1e1',' 10 ','','  ','+10','0x10','1.0','0','101']) {
  const query=new URLSearchParams({limit:value});
  assert.equal(parseBoardFilters(query),null);
  assert.equal(readTarget(new Request(`http://web.test/api/x?${query}`),`${path}/cards`).status,422);
 }
 for(const value of ['1','100','010']) assert.equal(parseBoardFilters(new URLSearchParams({limit:value})).limit,Number(value));
 assert.equal(parseBoardFilters(new URLSearchParams('limit=1&limit=2')),null);
 assert.deepEqual(parseBoardFilters(new URLSearchParams('tag=%20Alpha%20')), {tag:' Alpha '});
});
test('BFF only fixed UUID read targets, rejects path injection and mutations',async()=>{
 for(const target of ['/boards/not-uuid',`${path}/../me`,`${path}?evil=1`,`${path}/members/extra`,`${path}/cards/extra`]) assert.equal(readTarget(new Request('http://web.test/api/x'),target).status,422);
 assert.equal(readTarget(new Request('http://web.test/api/x',{method:'POST'}),path).status,405);
 const store={locked:async()=>{throw Error('must not touch store');}};
 const invalid=await new Bff({key,origin:'http://web.test',apiBase:'http://api.test/v1',production:false},store,async()=>{throw Error('must not fetch');}).handle(new Request('http://web.test/api/x'),'/boards/invalid');assert.equal(invalid.status,422);
});
test('contract scalar filters encoded/preserved and unrelated keys ignored',()=>{
 const request=new Request(`http://web.test/api/x?columnId=${other}&assigneeId=${id}&tag=%20Alpha%2B%20&cursor=a%2Bb%2F%3D&limit=100&url=https://evil.test`);
 const target=readTarget(request,`${path}/cards`),query=new URL(`http://api.test${target}`).searchParams;
 assert.equal(query.get('tag'),' Alpha+ ');assert.equal(query.get('cursor'),'a+b/=');assert.equal(query.get('columnId'),other);assert.equal(query.get('assigneeId'),id);assert.equal(query.get('limit'),'100');assert.equal(query.has('url'),false);
 assert.equal(readTarget(new Request('http://web.test/api/x?tag='),`${path}/cards`),`${path}/cards?tag=`);
 for(const query of ['limit=0','limit=101','limit=1.5','tag=a&tag=b','cursor=a&cursor=b','columnId=invalid'])assert.equal(readTarget(new Request(`http://web.test/api/x?${query}`),`${path}/cards`).status,422);
 assert.equal(readTarget(request,`${path}/columns`),`${path}/columns`);
});
test('read BFF preserves403/ETag and server bearer without browser token',async()=>{
 const store={locked:async(_hash,run)=>run({encrypted_tokens:encrypt({accessToken:'server-token',refreshToken:'server-refresh'},key,hash),expires_at:new Date(Date.now()+60000),revoked_at:null},{save:async()=>{},revoke:async()=>{}})};
 for(const suffix of ['', '/columns','/cards']){
  const app=new Bff({key,origin:'http://web.test',apiBase:'http://api.test/v1',production:false},store,async(url,init)=>{assert.equal(url,`http://api.test/v1${path}${suffix}`);assert.equal(init.headers.get('authorization'),'Bearer server-token');return Response.json({code:'NOT_MEMBER',message:'denied',details:{}},{status:403,headers:{ETag:'"3"'}});});
  const response=await app.handle(new Request(`http://web.test/api${path}${suffix}`,{headers:{cookie:`taskify_session=${cookie}`,Authorization:'Bearer browser-forged'}}),`${path}${suffix}`);assert.equal(response.status,403);assert.equal(response.headers.get('etag'),'"3"');assert.equal((await response.json()).code,'NOT_MEMBER');
 }
});
test('card full pagination maintains exact filters, order and computed fields; duplicate IDs excluded',async()=>{
 const signal=new AbortController().signal;let page=0;
 const cardA={id:'a',blocked:true,warnings:[],columnId:'col'},cardB={id:'b',blocked:true,warnings:['BLOCKED_BY_PREDECESSOR'],columnId:'done'};
 const api=createBrowserApi(async(url,init)=>{assert.equal(init.signal,signal);assert.equal(init.credentials,'same-origin');const query=new URL(`http://test${url}`).searchParams;assert.equal(query.get('tag'),' Alpha ');assert.equal(query.get('columnId'),other);assert.equal(query.get('assigneeId'),id);page++;if(page===1){assert.equal(query.has('cursor'),false);return Response.json({items:[cardA],nextCursor:'a+b/='});}assert.equal(query.get('cursor'),'a+b/=');return Response.json({items:[cardA,cardB],nextCursor:null});});
 assert.deepEqual(await api.allCards(id,{tag:' Alpha ',columnId:other,assigneeId:id},signal),[cardA,cardB]);assert.equal(page,2);
});
test('repeated cursor is an error instead of an incomplete-success/infinite loop',async()=>{let calls=0;const api=createBrowserApi(async()=>{calls++;return Response.json({items:[],nextCursor:'repeat'});});await assert.rejects(api.allCards(id),CardPaginationError);assert.equal(calls,2);});
test('aborted card pagination stops before requesting another page',async()=>{const controller=new AbortController();let calls=0;const api=createBrowserApi(async()=>{calls++;controller.abort();return Response.json({items:[],nextCursor:'next'});});await assert.rejects(api.allCards(id,{},controller.signal));assert.equal(calls,1);});

test('write targets reject injection and non-POST, Origin refusal precedes session store',async()=>{
 const targets=[`/columns/${id}/cards`,`/cards/${id}/move`];
 const store={locked:async()=>{throw Error('must not touch store');}};
 const app=new Bff({key,origin:'http://web.test',apiBase:'http://api.test/v1',production:false},store,async()=>{throw Error('must not fetch');});
 for(const target of targets){
  assert.equal(readTarget(new Request('http://web.test/api/x'),target).status,405);
  for(const origin of [undefined,'http://evil.test']) assert.equal((await app.handle(new Request('http://web.test/api/x',{method:'POST',headers:origin?{Origin:origin}:{}}),target)).status,403);
 }
 for(const target of ['/columns/invalid/cards',`/cards/${id}/../me`,`/columns/${id}/move`]) assert.equal(readTarget(new Request('http://web.test/api/x',{method:'POST'}),target).status,422);
});

test('write BFF preserves body, If-Match, error/current ETag and only server bearer',async()=>{
 const store={locked:async(_hash,run)=>run({encrypted_tokens:encrypt({accessToken:'server-token',refreshToken:'server-refresh'},key,hash),expires_at:new Date(Date.now()+60000),revoked_at:null},{save:async()=>{},revoke:async()=>{}})};
 for(const [target,status,code] of [[`/columns/${id}/cards`,201,undefined],[`/cards/${id}/move`,200,undefined],[`/cards/${id}/move`,409,'VERSION_CONFLICT'],[`/cards/${id}/move`,409,'WIP_LIMIT_EXCEEDED'],[`/cards/${id}/move`,422,'CROSS_BOARD'],[`/cards/${id}/move`,428,'IF_MATCH_REQUIRED']]){
  const body=JSON.stringify({title:' raw ',tagNames:[' Tag '],toColumnId:other});
  const app=new Bff({key,origin:'http://web.test',apiBase:'http://api.test/v1',production:false},store,async(url,init)=>{assert.equal(url,`http://api.test/v1${target}`);assert.equal(init.headers.get('authorization'),'Bearer server-token');assert.equal(init.headers.get('if-match'),'"7"');assert.equal(init.body,body);return Response.json(code?{code,details:{version:8}}:{id,version:7},{status,headers:{ETag:'"7"'}});});
  const response=await app.handle(new Request('http://web.test/api/x',{method:'POST',headers:{Origin:'http://web.test',cookie:`taskify_session=${cookie}`,Authorization:'Bearer forged','If-Match':'"7"'},body}),target);
  assert.equal(response.status,status);assert.equal(response.headers.get('etag'),'"7"');assert.equal((await response.json()).code,code);
 }
});

test('browser writes preserve optional raw fields, quoted If-Match, response ETag; role follows all pages',async()=>{
 let calls=0;
 const api=createBrowserApi(async(url,init)=>{
  calls++;assert.equal(init.credentials,'same-origin');assert.equal(new Headers(init.headers).has('authorization'),false);
  if(init.method==='POST'){
   if(url.includes('/columns/')) assert.deepEqual(JSON.parse(init.body),{title:' raw ',description:' ',assigneeId:other,dueAt:null,predecessorId:id,tagNames:[' Tag ','tag']});
   else {assert.equal(new Headers(init.headers).get('if-match'),'"7"');assert.deepEqual(JSON.parse(init.body),{toColumnId:other,beforeCardId:null});}
   return Response.json({id,version:7},{headers:{ETag:'"7"'}});
  }
  return Response.json(url.includes('cursor=')?{items:[{id,myRole:'VIEWER'}],nextCursor:null}:{items:[{id:other,myRole:'OWNER'}],nextCursor:'next'});
 });
 assert.equal((await api.createCard(id,{title:' raw ',description:' ',assigneeId:other,dueAt:null,predecessorId:id,tagNames:[' Tag ','tag']})).etag,'"7"');
 assert.equal((await api.moveCard(id,{toColumnId:other,beforeCardId:null},'"7"')).card.version,7);
 assert.equal(await api.boardRole(id),'VIEWER');assert.equal(calls,4);
 const upper=createBrowserApi(async()=>Response.json({items:[{id:'abcdefab-0000-4000-8000-000000000001',myRole:'EDITOR'}],nextCursor:null}));assert.equal(await upper.boardRole('ABCDEFAB-0000-4000-8000-000000000001'),'EDITOR');
});


test('members read uses fixed GET target, preserves public projection and failures',async()=>{
 const member={userId:other,role:'VIEWER',joinedAt:'2026-10-13T00:00:00Z',nickname:'<safe name>'};
 assert.equal(readTarget(new Request('http://web.test/api/x?extra=ignored'),`${path}/members`),`${path}/members`);
 assert.equal(readTarget(new Request('http://web.test/api/x',{method:'POST'}),`${path}/members`).status,405);
 const store={locked:async(_hash,run)=>run({encrypted_tokens:encrypt({accessToken:'server-token',refreshToken:'server-refresh'},key,hash),expires_at:new Date(Date.now()+60000),revoked_at:null},{save:async()=>{},revoke:async()=>{}})};
 const app=new Bff({key,origin:'http://web.test',apiBase:'http://api.test/v1',production:false},store,async(url,init)=>{assert.equal(url,`http://api.test/v1${path}/members`);assert.equal(init.headers.get('authorization'),'Bearer server-token');return Response.json({items:[member]});});
 const response=await app.handle(new Request('http://web.test/api/x',{headers:{cookie:`taskify_session=${cookie}`}}),`${path}/members`);assert.deepEqual(await response.json(),{items:[member]});
 const api=createBrowserApi(async(url,init)=>{assert.equal(url,`/api${path}/members`);assert.equal(init.credentials,'same-origin');return Response.json({items:[member]});});assert.deepEqual(await api.members(id),{items:[member]});
 const denied=createBrowserApi(async()=>Response.json({code:'NOT_MEMBER'},{status:403}));await assert.rejects(denied.members(id),error=>error.status===403 && error.body.code==='NOT_MEMBER');
});
