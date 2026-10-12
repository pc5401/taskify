// Approved cycle02 reads. Seed only new fixtures in the retained isolated cluster.
const fs = require('node:fs'); const path = require('node:path'); const crypto = require('node:crypto');
const assert = require('node:assert/strict'); const api = path.resolve(__dirname, '..');
const { configFile } = JSON.parse(fs.readFileSync(path.join(api, '.runtime', 'active-db.json'), 'utf8'));
const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
if (config.host !== '127.0.0.1' || config.port !== 55432 || config.database !== 'taskify_validation') throw new Error('Not isolated validation DB');
const env = JSON.parse(fs.readFileSync(path.join(config.directory, 'runtime-env.json'), 'utf8'));
process.env.DATABASE_URL = env.DATABASE_URL;
process.env.NODE_PATH = process.env.TASKIFY_API_DEPENDENCIES; require('node:module').Module._initPaths();
const { PrismaClient } = require(path.join(api, 'generated', 'client')); const db = new PrismaClient();
const prefix = crypto.randomUUID(); const results = [];
async function http(route, token, method = 'GET', body, status = 200) {
  const response = await fetch(env.TASKIFY_API_BASE + route, { method,
    headers: { ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}) });
  assert.equal(response.status, status, `Unexpected HTTP on ${method} ${route}`);
  const value = response.status === 204 ? null : await response.json();
  return { value, headers: response.headers };
}
async function check(name, work) { await work(); results.push({ name, passed: true }); }
async function main() {
  const accounts = {};
  for (const role of ['owner', 'editor', 'viewer', 'outside', 'invited']) {
    accounts[role] = (await http('/auth/register', null, 'POST', { email: `be-read-${prefix}-${role}@example.test`, password: 'cycle02-valid-password', nickname: role }, 201)).value;
  }
  const owner = accounts.owner; const board = (await http('/boards', owner.accessToken, 'POST', { title: 'BE cycle02 ' + prefix }, 201)).value;
  const foreign = (await http('/boards', owner.accessToken, 'POST', { title: 'BE foreign ' + prefix }, 201)).value;
  await db.boardMember.createMany({ data: ['editor', 'viewer'].map(role => ({ boardId: board.id, userId: accounts[role].user.id, role: role.toUpperCase() })) });
  await db.invitation.create({ data: { boardId: board.id, inviteeEmail: accounts.invited.user.email, requestedRole: 'VIEWER' } });
  const columns = await db.column.findMany({ where: { boardId: board.id }, orderBy: { position: 'asc' } });
  const extra = await db.column.create({ data: { boardId: board.id, title: 'tie position', position: 0 } });
  const foreignColumn = await db.column.findFirst({ where: { boardId: foreign.id } });
  const alpha = await db.tag.create({ data: { boardId: board.id, name: 'Alpha' } });
  const special = [];
  async function card(columnId, position, predecessorId = null) {
    return db.card.create({ data: { boardId: board.id, columnId, position, title: 'card ' + position, creatorId: owner.user.id,
      predecessorId, assigneeId: accounts.viewer.user.id } });
  }
  special.push(await card(columns[0].id, -2));
  special.push(await card(columns[2].id, -1));
  special.push(await card(columns[0].id, 0, special[0].id));
  special.push(await card(columns[2].id, 0, special[0].id));
  special.push(await card(columns[0].id, 0, special[1].id));
  await db.cardTag.create({ data: { boardId: board.id, cardId: special[2].id, tagId: alpha.id } });
  for (let index = 0; index < 23; index++) await card(index % 2 ? columns[1].id : extra.id, (index % 4) * 1024);
  await card(columns[0].id, -3); // Unreferenced run-owned anchor permits the approved delete test.
  const routes = ['', '/columns', '/cards'];
  await check('all three membership roles read all endpoints, detail ETag and empty board', async () => {
    for (const role of ['owner', 'editor', 'viewer']) for (const suffix of routes) await http(`/boards/${board.id}${suffix}`, accounts[role].accessToken);
    const detail = await http(`/boards/${board.id}`, owner.accessToken); assert.equal(detail.headers.get('etag'), '"1"'); assert.equal(detail.value.myRole, undefined);
    assert.deepEqual((await http(`/boards/${foreign.id}/cards`, owner.accessToken)).value, { items: [], nextCursor: null });
  });
  await check('nonmember/pending invitation/missing board deny without content', async () => {
    for (const role of ['outside', 'invited']) for (const suffix of routes) {
      assert.equal((await http(`/boards/${board.id}${suffix}`, accounts[role].accessToken, 'GET', null, 403)).value.code, 'NOT_MEMBER');
    }
    for (const suffix of routes) assert.equal((await http(`/boards/${crypto.randomUUID()}${suffix}`, owner.accessToken, 'GET', null, 403)).value.code, 'NOT_MEMBER');
  });
  await check('columns position/id order and public schema omit card data', async () => {
    const expected = await db.column.findMany({ where: { boardId: board.id }, orderBy: [{ position: 'asc' }, { id: 'asc' }] });
    const response = (await http(`/boards/${board.id}/columns`, accounts.viewer.accessToken)).value.items;
    assert.deepEqual(response.map(v => v.id), expected.map(v => v.id));
    assert.ok(response.every(v => v.boardId === board.id && !('cards' in v) && v.wipLimit === null));
  });
  await check('blocked/warnings/tagNames/null projection derives from direct predecessor', async () => {
    const response = (await http(`/boards/${board.id}/cards?limit=100`, owner.accessToken)).value.items;
    const get = index => response.find(v => v.id === special[index].id);
    assert.equal(get(0).blocked, false); assert.equal(get(2).blocked, true); assert.deepEqual(get(2).warnings, []);
    assert.equal(get(3).blocked, true); assert.deepEqual(get(3).warnings, ['BLOCKED_BY_PREDECESSOR']); assert.equal(get(4).blocked, false);
    assert.deepEqual(get(2).tagNames, ['Alpha']); assert.equal(get(2).description, null); assert.equal(get(2).dueAt, null);
    assert.ok(response.every(v => !('creatorId' in v) && !('completed' in v) && !('column' in v) && !('predecessor' in v)));
  });
  await check('AND exact-tag filters plus valid foreign/unknown IDs return empty', async () => {
    const query = `columnId=${columns[0].id}&assigneeId=${accounts.viewer.user.id}&tag=Alpha`;
    assert.deepEqual((await http(`/boards/${board.id}/cards?${query}`, owner.accessToken)).value.items.map(v => v.id), [special[2].id]);
    for (const query of ['tag=alpha', 'tag=', `columnId=${foreignColumn.id}`, `columnId=${crypto.randomUUID()}`, `assigneeId=${accounts.outside.user.id}`]) {
      assert.deepEqual((await http(`/boards/${board.id}/cards?${query}`, owner.accessToken)).value, { items: [], nextCursor: null });
    }
  });
  await check('stable global cards page has no duplicates or omissions and binds board/filters', async () => {
    const expected = await db.card.findMany({ where: { boardId: board.id }, orderBy: [{ position: 'asc' }, { id: 'asc' }] });
    const ids = []; let cursor;
    do { const page = (await http(`/boards/${board.id}/cards?limit=3${cursor ? '&cursor=' + cursor : ''}`, owner.accessToken)).value;
      ids.push(...page.items.map(v => v.id)); cursor = page.nextCursor;
    } while (cursor);
    assert.deepEqual(ids, expected.map(v => v.id));
    const first = (await http(`/boards/${board.id}/cards?limit=1`, owner.accessToken)).value;
    await http(`/boards/${foreign.id}/cards?cursor=${first.nextCursor}`, owner.accessToken, 'GET', null, 422);
    await http(`/boards/${board.id}/cards?tag=Alpha&cursor=${first.nextCursor}`, owner.accessToken, 'GET', null, 422);
    // Only the newly seeded run-owned anchor is removed; existing data never deleted/reset.
    await db.card.delete({ where: { id: first.items[0].id } });
    const next = (await http(`/boards/${board.id}/cards?limit=1&cursor=${first.nextCursor}`, owner.accessToken)).value;
    assert.equal(next.items[0].id, expected[1].id);
  });
  await check('malformed UUID/query errors and unauthenticated/revoked session errors', async () => {
    for (const suffix of routes) { await http(`/boards/bad${suffix}`, owner.accessToken, 'GET', null, 422); await http(`/boards/${board.id}${suffix}`, null, 'GET', null, 401); }
    for (const query of ['limit=0', 'limit=101', 'limit=1&limit=2', 'tag=a&tag=b', 'columnId=bad', 'cursor=broken']) await http(`/boards/${board.id}/cards?${query}`, owner.accessToken, 'GET', null, 422);
    await http('/auth/logout', accounts.viewer.accessToken, 'POST', null, 204);
    for (const suffix of routes) await http(`/boards/${board.id}${suffix}`, accounts.viewer.accessToken, 'GET', null, 401);
  });
  await check('repeated GET leaves all remaining board/column/card state unchanged', async () => {
    const snapshot = async () => JSON.stringify({ board: await db.board.findUnique({ where: { id: board.id } }), columns: await db.column.findMany({ where: { boardId: board.id }, orderBy: { id: 'asc' } }), cards: await db.card.findMany({ where: { boardId: board.id }, orderBy: { id: 'asc' } }) });
    const before = await snapshot(); for (const suffix of routes) await http(`/boards/${board.id}${suffix}`, owner.accessToken); assert.equal(await snapshot(), before);
  });
  const report = { prefix, results, note: '8 live read checks; fixtures retained except approved new anchor. No card creation/movement product route tested or added.' };
  fs.writeFileSync(path.join(config.directory, 'be-cycle02-reads.json'), JSON.stringify(report, null, 2)); console.log(JSON.stringify(report, null, 2));
}
main().catch(e => { console.error(e.message); process.exitCode = 1; }).finally(() => db.$disconnect());
