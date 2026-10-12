import test from 'node:test';
import assert from 'node:assert/strict';
import { createBrowserApi, BrowserApiError } from '../src/browser-api.ts';
test('auth preserves exact email/password and only uses BFF cookies',async()=>{
 const api=createBrowserApi(async(url,init)=>{assert.equal(url,'/api/auth/register');assert.equal(init.credentials,'same-origin');assert.equal(init.headers.Authorization,undefined);assert.deepEqual(JSON.parse(init.body),{email:' Case@example.test ',password:' unchanged ',nickname:'QA'});return Response.json({user:{id:'u'}});});
 assert.deepEqual(await api.register({email:' Case@example.test ',password:' unchanged ',nickname:'QA'}),{user:{id:'u'}});
});
test('opaque pagination and server ordering preserved, nextCursor null stays null',async()=>{
 const page={items:[{id:'second',myRole:'VIEWER'},{id:'first',myRole:'OWNER'}],nextCursor:null};
 const api=createBrowserApi(async(url)=>{assert.equal(url,'/api/boards?cursor=a%2Bb%2F%3D');return Response.json(page);});assert.deepEqual(await api.boards('a+b/='),page);
});
test('invalid bookmark and logout uncertainty remain errors, never empty success',async()=>{
 const api=createBrowserApi(async(url)=>Response.json({code:url.includes('boards')?'INVALID_INPUT':undefined,message:'Upstream revocation unconfirmed',details:{}},{status:url.includes('boards')?422:502}));
 await assert.rejects(api.boards('bad'),e=>e instanceof BrowserApiError&&e.status===422&&e.body.code==='INVALID_INPUT');
 await assert.rejects(api.logout(),e=>e instanceof BrowserApiError&&e.status===502);
});
test('board default is omitted and signal propagated, logout204 has no JSON parse',async()=>{
 const controller=new AbortController(),api=createBrowserApi(async(url,init)=>{assert.equal(init.signal,controller.signal);if(url==='/api/boards'){assert.deepEqual(JSON.parse(init.body),{title:'board'});return Response.json({id:'b'},{status:201});}return new Response(null,{status:204});});
 assert.deepEqual(await api.createBoard({title:'board'},controller.signal),{id:'b'});assert.equal(await api.logout(controller.signal),undefined);
});
