import test from 'node:test';
import assert from 'node:assert/strict';
import { Bff } from '../src/server/bff.ts';
import { encrypt, decrypt, encryptionKey, sessionHash, loginDeadline } from '../src/server/crypto.ts';
const now = 1800000000000, key = Buffer.alloc(32, 3), opaque = 'a'.repeat(64), hash = sessionHash(opaque);
const config = { origin: 'https://web.test', apiBase: 'https://api.test/v1', key, production: true };
const jwt = `x.${Buffer.from(JSON.stringify({iat:now/1000})).toString('base64url')}.x`;
const req = (path='/me', method='GET', origin=config.origin) => new Request(`https://web.test/api${path}`, {method, headers:{cookie:`taskify_session=${opaque}`,origin,authorization:'Bearer browser-forged'}});
// Explicit mock transaction store; never imported by runtime.ts.
class MockStore {
  row = {session_hash:hash,encrypted_tokens:encrypt({accessToken:'old',refreshToken:'r0'},key,hash),expires_at:new Date(now+100000),revoked_at:null};
  tail = Promise.resolve(); saves=0; creates=[];
  async create(...args){this.creates.push(args);}
  async locked(_hash, fn){const previous=this.tail; let release; this.tail=new Promise(r=>release=r); await previous; try{return await fn(this.row,{save:async v=>{this.row.encrypted_tokens=v;this.saves++;},revoke:async()=>{this.row.revoked_at=new Date(now);}});}finally{release();}}
}
test('origin refusal touches neither store nor upstream', async()=>{
  const store=new MockStore();const app=new Bff(config,store,async()=>{throw Error('must not fetch');},()=>now);
  for(const origin of ['', 'https://evil.test']) assert.equal((await app.handle(req('/auth/logout','POST',origin),'/auth/logout')).status,403);
  assert.equal(store.row.revoked_at,null);
});
test('login persistent secure opaque cookie and no token response',async()=>{
 const store=new MockStore(), app=new Bff(config,store,async()=>Response.json({accessToken:jwt,refreshToken:'secret-refresh',user:{id:'u'}},{status:201}),()=>now);
 const response=await app.handle(req('/auth/register','POST'),'/auth/register');
 assert.equal(response.status,201);assert.deepEqual(await response.json(),{user:{id:'u'}});
 assert.match(response.headers.get('set-cookie'),/taskify_session=[a-f0-9]{64}; HttpOnly; SameSite=Lax; Path=\/; Max-Age=604800;.*Secure/);
 assert.equal(store.creates.length,1);assert.notEqual(store.creates[0][0],opaque);assert(!store.creates[0][1].includes('secret-refresh'));
});
test('AES authenticated encryption is row bound and key required',()=>{
 const cipher=encrypt({accessToken:'a',refreshToken:'r'},key,hash);
 assert.deepEqual(decrypt(cipher,key,hash),{accessToken:'a',refreshToken:'r'});
 assert.throws(()=>decrypt(cipher,key,'other'));assert.throws(()=>decrypt(cipher+'x',key,hash));assert.throws(()=>encryptionKey(undefined));
 assert.equal(loginDeadline(jwt,now),now+604800000);assert.throws(()=>loginDeadline('invalid',now));
});
test('two workers reread locked row and rotate once',async()=>{
 const store=new MockStore();let rotations=0;
 const fetcher=async(url,init)=>{assert.equal(init.redirect,'error'); assert(init.signal); if(url.endsWith('/refresh')){rotations++;assert.equal(JSON.parse(init.body).refreshToken,'r0');return Response.json({accessToken:'new',refreshToken:'r1'});}assert.notEqual(init.headers.get('authorization'),'Bearer browser-forged');return init.headers.get('authorization')==='Bearer old'?Response.json({code:'UNAUTHENTICATED'},{status:401}):Response.json({id:'u',accessToken:'new',message:'new'});};
 const workers=[new Bff(config,store,fetcher,()=>now),new Bff(config,store,fetcher,()=>now)];
 const responses=await Promise.all(workers.map(w=>w.handle(req(),'/me')));
 assert.deepEqual(responses.map(r=>r.status),[200,200]);assert.equal(rotations,1);assert.equal(store.saves,1);assert.equal(store.row.expires_at.getTime(),now+100000);
 assert.deepEqual(await responses[0].json(),{id:'u',message:'[redacted]'});
});
test('absolute expiry denies without fetch',async()=>{const store=new MockStore();store.row.expires_at=new Date(now); const response=await new Bff(config,store,async()=>{throw Error('must not fetch');},()=>now).handle(req(),'/me');assert.equal(response.status,401);assert.match(response.headers.get('set-cookie'),/Max-Age=0/);});
test('logout network failure revokes locally and reports uncertainty',async()=>{const store=new MockStore();const response=await new Bff(config,store,async()=>{throw Error('network');},()=>now).handle(req('/auth/logout','POST'),'/auth/logout');assert.equal(response.status,502);assert(store.row.revoked_at);assert.match((await response.json()).message,/could not be confirmed/);assert.match(response.headers.get('set-cookie'),/Max-Age=0/);});
test('expired access logout refreshes then revokes current token',async()=>{const store=new MockStore(), calls=[]; const response=await new Bff(config,store,async(url,init)=>{calls.push([url,init.headers.get('authorization')]);if(url.endsWith('/refresh'))return Response.json({accessToken:'new',refreshToken:'r1'});if(init.headers.get('authorization')==='Bearer old')return Response.json({code:'UNAUTHENTICATED'},{status:401});return new Response(null,{status:204});},()=>now).handle(req('/auth/logout','POST'),'/auth/logout');assert.equal(response.status,204);assert.equal(calls[2][1],'Bearer new');assert(store.row.revoked_at);});
test('boards query and write error status/ETag preserved',async()=>{const store=new MockStore();const response=await new Bff(config,store,async(url,init)=>{assert.equal(url,'https://api.test/v1/boards?limit=2');return Response.json({code:'INVALID_INPUT',message:'bad cursor'},{status:422,headers:{etag:'"4"'}});},()=>now).handle(new Request('https://web.test/api/boards?limit=2',{headers:{cookie:`taskify_session=${opaque}`}}),'/boards');assert.equal(response.status,422);assert.equal(response.headers.get('etag'),'"4"');assert.equal((await response.json()).code,'INVALID_INPUT');});
