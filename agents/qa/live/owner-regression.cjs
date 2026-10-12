// Independent real-Prisma regression for the internal transaction boundary, not a role HTTP route.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { randomUUID } = require('node:crypto');
if (process.argv.includes('--check')) { console.log('Owner regression syntax/preparation only; no DB connection.'); process.exit(0); }
const env = process.env;
assert.equal(env.TASKIFY_QA_LIVE_READY, 'approved-isolated-vs1');
const config = JSON.parse(fs.readFileSync(env.TASKIFY_LIVE_ENV_FILE, 'utf8'));
const url = new URL(config.DATABASE_URL);
assert.equal(url.hostname, '127.0.0.1'); assert.equal(url.port, '55432'); assert.equal(url.pathname, '/taskify_validation');
const source = env.TASKIFY_QA_OWNER_SOURCE, deps = env.TASKIFY_QA_OWNER_DEPS;
assert(source && deps && env.TASKIFY_QA_OWNER_SHA);
const sha = require('node:child_process').execFileSync('git', ['rev-parse','HEAD'], { cwd: source, encoding: 'utf8' }).trim();
assert.equal(sha, env.TASKIFY_QA_OWNER_SHA, 'Source must target final SHA');
env.NODE_PATH = deps; require('node:module').Module._initPaths(); require('reflect-metadata');
const ts = require(path.join(deps, 'typescript'));
// Transform source in memory; no writes to the BE checkout or dependency directory.
require.extensions['.ts'] = (module, filename) => {
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: {
    target: ts.ScriptTarget.ES2021, module: ts.ModuleKind.CommonJS,
    experimentalDecorators: true, emitDecoratorMetadata: true, esModuleInterop: true,
  }, fileName: filename });
  module._compile(output.outputText, filename);
};
const { PrismaClient } = require(path.join(source, 'generated/client'));
const { TransactionsService } = require(path.join(source, 'src/persistence/transactions.service.ts'));
const db = new PrismaClient({ datasources: { db: { url: config.DATABASE_URL } } });
const service = new TransactionsService(db), run = randomUUID(), title = `qa_owner_${run}`;
let stage = 'setup';
async function expectedLastOwner(work) {
  await assert.rejects(() => service.run(work), error => error.getStatus?.() === 409 && error.getResponse?.().code === 'LAST_OWNER');
}
async function main() {
  const database = await db.$queryRaw`SELECT current_database() AS name`;
  assert.equal(database[0].name, 'taskify_validation');
  const user = await db.user.create({ data: { email: `owner${run}@example.test`, nickname: 'QA owner', passwordHash: 'scrypt-v1$'+'0'.repeat(32)+'$'+'0'.repeat(128) } });
  const board = await service.run(async tx => {
    const board = await tx.board.create({ data: { title } });
    await tx.boardMember.create({ data: { boardId: board.id, userId: user.id, role: 'OWNER' } });
    return board;
  });
  console.log('PASS valid owner fixture commit');
  stage = 'last owner rollback and 409';
  const before = await db.board.findUnique({ where: { id: board.id } });
  const memberBefore = await db.boardMember.findUnique({ where: { boardId_userId: { boardId: board.id,userId: user.id } } });
  await expectedLastOwner(async tx => {
    await tx.board.update({ where: { id: board.id }, data: { title: title+'-must-rollback',version:{increment:1} } });
    await tx.boardMember.update({ where: { boardId_userId: { boardId: board.id,userId:user.id } },data:{role:'VIEWER'} });
  });
  assert.deepEqual(await db.board.findUnique({ where: { id: board.id } }), before);
  assert.deepEqual(await db.boardMember.findUnique({ where: { boardId_userId: { boardId: board.id,userId:user.id } } }), memberBefore);
  console.log('PASS last owner service 409 LAST_OWNER and full board/member rollback');
  stage = 'ownerless insert rollback and 409';
  const ownerless = randomUUID();
  await expectedLastOwner(tx => tx.board.create({ data:{id:ownerless,title:title+'-ownerless'} }));
  assert.equal(await db.board.findUnique({where:{id:ownerless}}),null);
  console.log('PASS ownerless insertion service 409 LAST_OWNER and no persisted board');
  stage = 'unrelated check not misclassified';
  const badColumn = randomUUID();
  await assert.rejects(() => service.run(tx => tx.$executeRaw`INSERT INTO columns(id,board_id,title,position,wip_limit) VALUES(${badColumn}::uuid,${board.id}::uuid,'QA bad WIP',0,0)`), error => error.code === 'P2010' && error.meta?.code === '23514' && error.getResponse?.().code !== 'LAST_OWNER');
  assert.equal(await db.column.findUnique({where:{id:badColumn}}),null);
  assert.deepEqual(await db.board.findUnique({where:{id:board.id}}),before);
  console.log('PASS unrelated WIP CHECK preserves database error and rollback');
  stage = 'valid commit after failures';
  const changed = await service.run(tx=>tx.board.update({where:{id:board.id},data:{title:title+'-valid',version:{increment:1}}}));
  assert.equal(changed.version,before.version+1);
  assert.equal((await db.boardMember.findUnique({where:{boardId_userId:{boardId:board.id,userId:user.id}}})).role,'OWNER');
  console.log('PASS valid transaction still commits after constraint rejection');
  console.log(`Owner regression completed: 5 checks; source ${sha}; fixture ${run}. No role HTTP acceptance claimed.`);
}
main().catch(error=>{console.error(`FAIL ${stage}: ${error.code||error.name}; sensitive details withheld`);process.exitCode=1;}).finally(()=>db.$disconnect());
