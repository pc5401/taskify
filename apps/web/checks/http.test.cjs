const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
if (!process.env.TASKIFY_TYPESCRIPT) throw new Error('Set TASKIFY_TYPESCRIPT to an existing TypeScript module path.');
const ts = require(process.env.TASKIFY_TYPESCRIPT);
const compiled = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/http.ts'), 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
});
const exportsObject = {};
vm.runInNewContext(compiled.outputText, { exports: exportsObject, Headers, URLSearchParams, JSON, Error });
const { createReadClient, HttpError, ResponseFormatError } = exportsObject;
const context = { headers: { Authorization: 'Bearer test-only' }, credentials: 'omit' };

test('list pagination, explicit auth and ETag pass through without transforming computed fields', async () => {
  let captured;
  const fixture = { items: [{ myRole: 'VIEWER' }], nextCursor: null };
  const client = createReadClient('http://test.invalid/v1/', async (url, init) => {
    captured = { url, init };
    return new Response(JSON.stringify(fixture), { headers: { ETag: '"4"' } });
  });
  const result = await client.listBoards(context, { cursor: 'a+b', limit: 10 });
  assert.equal(captured.url, 'http://test.invalid/v1/boards?cursor=a%2Bb&limit=10');
  assert.equal(captured.init.headers.get('Authorization'), 'Bearer test-only');
  assert.equal(captured.init.credentials, 'omit');
  assert.equal(result.etag, '"4"');
  assert.deepEqual(result.data, fixture);
});
test('HTTP domain error retains status/code/details, and performs no retry', async () => {
  let calls = 0;
  const body = { code: 'NOT_MEMBER', message: 'denied', details: {} };
  const client = createReadClient('/v1', async () => { calls++; return new Response(JSON.stringify(body), { status: 403 }); });
  await assert.rejects(client.getBoard('x/y', context), error => error instanceof HttpError && error.status === 403 && error.body.code === 'NOT_MEMBER');
  assert.equal(calls, 1);
});
test('non-JSON failure preserves diagnostic body; success rejects invalid JSON', async () => {
  const failed = createReadClient('/v1', async () => new Response('unavailable', { status: 503 }));
  await assert.rejects(failed.listBoards(context), error => error instanceof HttpError && error.body === 'unavailable');
  const invalid = createReadClient('/v1', async () => new Response('<html>'));
  await assert.rejects(invalid.listBoards(context), error => error instanceof ResponseFormatError);
});
test('network failures are not mistaken for empty lists', async () => {
  const failure = new TypeError('network');
  const client = createReadClient('/v1', async () => { throw failure; });
  await assert.rejects(client.listBoards(context), error => error === failure);
});
test('card path is encoded, AbortSignal forwarded and server fields preserved', async () => {
  const controller = new AbortController();
  const fixture = { items: [{ blocked: true, warnings: ['BLOCKED_BY_PREDECESSOR'] }], nextCursor: null };
  const client = createReadClient('/v1', async (url, init) => {
    assert.equal(url, '/v1/boards/a%2Fb/cards');
    assert.equal(init.signal, controller.signal);
    return new Response(JSON.stringify(fixture));
  });
  assert.deepEqual((await client.listCards('a/b', { ...context, signal: controller.signal })).data, fixture);
});
