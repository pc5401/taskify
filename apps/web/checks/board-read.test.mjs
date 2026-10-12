import test from 'node:test';
import assert from 'node:assert/strict';
import { Bff } from '../src/server/bff.ts';
import { readTarget } from '../src/server/read-target.ts';
import { createBrowserApi, CardPaginationError } from '../src/browser-api.ts';
import { encrypt, sessionHash } from '../src/server/crypto.ts';
const id='00000000-0000-4000-8000-000000000001',other='00000000-0000-4000-8000-000000000002';
const path=`/boards/${id}`,key=Buffer.alloc(32,5),cookie='b'.repeat(64),hash=sessionHash(cookie);
test('BFF only fixed UUID read targets, rejects path injection and mutations',async()=>{
 for(const target of ['/boards/not-uuid',`${path}/../me`,`${path}?evil=1`,`${path}/members`,`${path}/cards/extra`]) assert.equal(readTarget(new Request('http://web.test/api/x'),target).status,422);
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
