// Only an explicitly provisioned isolated cluster; create unique fixtures, retain data.
const fs = require('node:fs'); const path = require('node:path'); const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const api = path.resolve(__dirname, '..');
const { configFile } = JSON.parse(fs.readFileSync(path.join(api, '.runtime', 'active-db.json'), 'utf8'));
const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
if (config.host !== '127.0.0.1' || config.port !== 55432 || config.database !== 'taskify_validation' || !config.directory.startsWith(path.join(api, '.runtime') + path.sep)) throw new Error('Not the isolated validation cluster');
const env = JSON.parse(fs.readFileSync(path.join(config.directory, 'runtime-env.json'), 'utf8'));
process.env.DATABASE_URL = env.DATABASE_URL;
process.env.NODE_PATH = process.env.TASKIFY_API_DEPENDENCIES; require('node:module').Module._initPaths();
const { PrismaClient } = require(path.join(api, 'generated', 'client'));
const { TransactionsService } = require(path.join(api, 'dist', 'persistence', 'transactions.service'));
const db = new PrismaClient(); const transactions = new TransactionsService(db);
const results = []; const prefix = crypto.randomUUID();
async function check(name, work) { try { await work(); results.push({ name, passed: true }); } catch (e) { results.push({ name, passed: false, error: e.code ?? e.response?.code ?? e.message, metadata: e.meta }); } }
async function rejectCode(work, code, status) {
  let error;
  try { await work; } catch (e) { error = e; }
  assert.ok(error, 'Expected rejection');
  if (error.response?.code !== code || error.status !== status) {
    throw new Error(JSON.stringify({ expected: code, actual: error.response?.code, name: error.constructor.name, prismaCode: error.code, metadata: error.meta, messageTail: error.message.slice(-1100) }));
  }
}
async function main() {
  const user = await db.user.create({ data: { email: `be-live-${prefix}@example.test`, nickname: 'BE DB regression', passwordHash: 'fixture-only-unused' } });
  const foreignUser = await db.user.create({ data: { email: `be-live-other-${prefix}@example.test`, nickname: 'BE foreign user', passwordHash: 'fixture-only-unused' } });
  async function board(title, owner) { return db.$transaction(async tx => {
    const value = await tx.board.create({ data: { title } });
    await tx.boardMember.create({ data: { boardId: value.id, userId: owner, role: 'OWNER' } }); return value;
  }); }
  const a = await board('BE regression ' + prefix, user.id); const b = await board('BE foreign ' + prefix, foreignUser.id);
  const ca = await db.column.create({ data: { boardId: a.id, title: 'done', position: 0, isDone: true } });
  const cb = await db.column.create({ data: { boardId: b.id, title: 'done', position: 0, isDone: true } });
  const one = await db.card.create({ data: { boardId: a.id, columnId: ca.id, creatorId: user.id, title: 'A', position: 0 } });
  const two = await db.card.create({ data: { boardId: a.id, columnId: ca.id, creatorId: user.id, title: 'B', position: 1024 } });
  const foreign = await db.card.create({ data: { boardId: b.id, columnId: cb.id, creatorId: foreignUser.id, title: 'foreign', position: 0 } });
  const ta = await db.tag.create({ data: { boardId: a.id, name: 'be-' + prefix } });
  const tb = await db.tag.create({ data: { boardId: b.id, name: 'be-other-' + prefix } });
  await check('both migrations applied', async () => {
    const rows = await db.$queryRaw`SELECT migration_name, finished_at, rolled_back_at FROM _prisma_migrations ORDER BY migration_name`;
    assert.equal(rows.length, 2); assert.ok(rows.every(row => row.finished_at && !row.rolled_back_at));
  });
  const fkCases = [
    ['cards_column_board_fk', tx => tx.card.update({ where: { id: one.id }, data: { columnId: cb.id } })],
    ['cards_predecessor_board_fk', tx => tx.card.update({ where: { id: one.id }, data: { predecessorId: foreign.id } })],
    ['cards_assignee_board_fk', tx => tx.card.update({ where: { id: one.id }, data: { assigneeId: foreignUser.id } })],
    ['card_tags_card_board_fk', tx => tx.cardTag.create({ data: { boardId: a.id, cardId: foreign.id, tagId: ta.id } })],
    ['card_tags_tag_board_fk', tx => tx.cardTag.create({ data: { boardId: a.id, cardId: one.id, tagId: tb.id } })],
  ];
  for (const [name, work] of fkCases) await check(name + ' maps 422 CROSS_BOARD', () => rejectCode(transactions.run(work), 'CROSS_BOARD', 422));
  await check('FK rejection preserves card', async () => {
    const value = await db.card.findUnique({ where: { id: one.id } }); assert.equal(value.columnId, ca.id); assert.equal(value.predecessorId, null); assert.equal(value.assigneeId, null);
  });
  await check('deferred owner trigger maps LAST_OWNER and rolls back board insertion', async () => {
    const id = crypto.randomUUID();
    await rejectCode(transactions.run(tx => tx.board.create({ data: { id, title: 'rollback owner ' + prefix } })), 'LAST_OWNER', 409);
    assert.equal(await db.board.findUnique({ where: { id } }), null);
  });
  await check('deferred owner trigger maps LAST_OWNER and preserves membership', async () => {
    await rejectCode(transactions.run(tx => tx.boardMember.update({ where: { boardId_userId: { boardId: a.id, userId: user.id } }, data: { role: 'VIEWER' } })), 'LAST_OWNER', 409);
    assert.equal((await db.boardMember.findUnique({ where: { boardId_userId: { boardId: a.id, userId: user.id } } })).role, 'OWNER');
  });
  await check('actual transaction rollback removes all partial creation rows', async () => {
    const id = crypto.randomUUID();
    await assert.rejects(db.$transaction(async tx => {
      await tx.board.create({ data: { id, title: 'failure injection ' + prefix } });
      await tx.boardMember.create({ data: { boardId: id, userId: user.id, role: 'OWNER' } });
      await tx.column.create({ data: { boardId: id, title: 'done', position: 0, isDone: true } });
      throw new Error('intentional rollback');
    }), /intentional rollback/);
    assert.equal(await db.board.count({ where: { id } }), 0); assert.equal(await db.boardMember.count({ where: { boardId: id } }), 0); assert.equal(await db.column.count({ where: { boardId: id } }), 0);
  });
  await check('concurrent opposite dependency writes produce one cycle rejection', async () => {
    const values = await Promise.allSettled([transactions.setDependency(a.id, one.id, two.id, user.id, '"1"'), transactions.setDependency(a.id, two.id, one.id, user.id, '"1"')]);
    assert.equal(values.filter(v => v.status === 'fulfilled').length, 1);
    const rejected = values.find(v => v.status === 'rejected'); assert.equal(rejected.reason.response.code, 'DEPENDENCY_CYCLE');
    const cards = await db.card.findMany({ where: { id: { in: [one.id, two.id] } } });
    assert.equal(cards.filter(v => v.predecessorId).length, 1); assert.deepEqual(cards.map(v => v.version).sort(), [1, 2]);
  });
  const report = { cluster: { host: config.host, port: config.port, database: config.database }, fixturePrefix: prefix, results, note: 'Internal transaction foundations only, not unimplemented HTTP acceptance. Fixtures retained; no reset/delete.' };
  fs.writeFileSync(path.join(config.directory, 'be-db-regression.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (results.some(v => !v.passed)) process.exitCode = 1;
}
main().catch(e => { console.error(e.message); process.exitCode = 1; }).finally(() => db.$disconnect());
