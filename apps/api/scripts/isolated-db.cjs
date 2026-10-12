// Existing binaries/dependencies are read-only. Never reset/drop/remove cluster data.
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const api = path.resolve(__dirname, '..');
const runtime = path.join(api, '.runtime');
const deps = process.env.TASKIFY_API_DEPENDENCIES;
if (!deps || !fs.existsSync(deps)) throw new Error('Existing TASKIFY_API_DEPENDENCIES required');
const bin = path.join(deps, '@embedded-postgres', 'windows-x64', 'native', 'bin');
const run = (file, args) => {
  fs.mkdirSync(runtime, { recursive: true });
  const log = fs.openSync(path.join(runtime, `${file}-control.log`), 'a');
  let result;
  try { result = spawnSync(path.join(bin, file + '.exe'), args, { windowsHide: true, cwd: api, stdio: ['ignore', log, log], timeout: 40000 }); }
  finally { fs.closeSync(log); }
  if (result.error || result.status) throw new Error(`${file} failed (${result.status})`);
};
async function main() {
  const command = process.argv[2];
  if (command === 'init') {
    // A successfully reserved loopback listener proves this port is currently free.
    await new Promise((resolve, reject) => {
      const probe = net.createServer(); probe.once('error', reject);
      probe.listen(55432, '127.0.0.1', () => probe.close(resolve));
    });
    const directory = path.join(runtime, 'pg-auth-boards-20261012-' + crypto.randomUUID());
    if (fs.existsSync(directory)) throw new Error('Refuse existing runtime target');
    fs.mkdirSync(directory, { recursive: true });
    const data = path.join(directory, 'data');
    if (fs.existsSync(data)) throw new Error('Refuse existing cluster data');
    const password = crypto.randomBytes(32).toString('hex');
    const configFile = path.join(directory, 'connection.json');
    const config = { directory, data, port: 55432, host: '127.0.0.1', user: 'taskify_validation', password, database: 'taskify_validation' };
    fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
    const passwordFile = path.join(directory, 'init-password');
    fs.writeFileSync(passwordFile, password + '\n');
    try { run('initdb', ['-D', data, '--auth=scram-sha-256', '--username=taskify_validation', '--pwfile=' + passwordFile, '--encoding=UTF8', '--locale=C']); }
    finally { fs.unlinkSync(passwordFile); } // Only our temporary credential file; never database data.
    fs.writeFileSync(path.join(runtime, 'active-db.json'), JSON.stringify({ configFile }));
    run('pg_ctl', ['-D', data, '-l', path.join(directory, 'postgres.log'), '-o', '-h 127.0.0.1 -p 55432', '-w', '-t', '30', 'start']);
    const { Client } = require(path.join(deps, 'pg'));
    const client = new Client({ ...config, database: 'postgres' });
    await client.connect();
    try { await client.query('CREATE DATABASE taskify_validation'); } finally { await client.end(); }
    const url = `postgresql://${config.user}:${password}@127.0.0.1:55432/taskify_validation?schema=public`;
    fs.writeFileSync(path.join(directory, 'runtime.env'), `DATABASE_URL=${url}\nAUTH_JWT_SECRET=${crypto.randomBytes(48).toString('hex')}\nPORT=3301\n`);
    console.log(JSON.stringify({ configFile, envFile: path.join(directory, 'runtime.env'), data, host: config.host, port: config.port, database: config.database }));
    return;
  }
  const { configFile } = JSON.parse(fs.readFileSync(path.join(runtime, 'active-db.json'), 'utf8'));
  const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
  const resolved = path.resolve(config.data);
  if (!resolved.startsWith(runtime + path.sep) || path.basename(resolved) !== 'data') throw new Error('Invalid managed cluster path');
  if (command === 'start') return run('pg_ctl', ['-D', resolved, '-l', path.join(config.directory, 'postgres.log'), '-o', '-h 127.0.0.1 -p 55432', '-w', '-t', '30', 'start']);
  if (command === 'connect') {
    const { Client } = require(path.join(deps, 'pg'));
    const client = new Client({ ...config, database: 'postgres', connectionTimeoutMillis: 5000 });
    await client.connect();
    try { const result = await client.query('SELECT version()'); console.log(result.rows[0].version); }
    finally { await client.end(); }
    return;
  }
  if (command === 'prepare') {
    const { Client } = require(path.join(deps, 'pg'));
    const client = new Client({ ...config, database: 'postgres', connectionTimeoutMillis: 5000 });
    await client.connect();
    try {
      const exists = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [config.database]);
      if (!exists.rowCount) await client.query('CREATE DATABASE taskify_validation');
    } finally { await client.end(); }
    const envFile = path.join(config.directory, 'runtime-env.json');
    const previous = fs.existsSync(envFile) ? JSON.parse(fs.readFileSync(envFile, 'utf8')) : {};
    fs.writeFileSync(envFile, JSON.stringify({ ...previous,
      DATABASE_URL: `postgresql://${config.user}:${config.password}@127.0.0.1:${config.port}/${config.database}?schema=public`,
      AUTH_JWT_SECRET: previous.AUTH_JWT_SECRET || crypto.randomBytes(48).toString('hex'), TASKIFY_SESSION_KEY: previous.TASKIFY_SESSION_KEY || crypto.randomBytes(32).toString('base64'),
      NEXT_APP_ORIGIN: 'http://127.0.0.1:3002', TASKIFY_API_BASE: 'http://127.0.0.1:3301/v1', PORT: '3301',
      TASKIFY_LIVE_DATABASE_NAME: 'taskify_validation', TASKIFY_LIVE_BFF_BASE: 'http://127.0.0.1:3002', TASKIFY_LIVE_BFF_SECOND: 'http://127.0.0.1:3003',
    }, null, 2));
    console.log(JSON.stringify({ envFile, host: config.host, port: config.port, database: config.database }));
    return;
  }
  if (command === 'stop') return run('pg_ctl', ['-D', resolved, '-m', 'fast', '-w', '-t', '30', 'stop']);
  if (command === 'status') return run('pg_ctl', ['-D', resolved, 'status']);
  if (command === 'deploy') {
    const env = { ...process.env, DATABASE_URL: `postgresql://${config.user}:${config.password}@127.0.0.1:${config.port}/${config.database}?schema=public` };
    const result = spawnSync(process.execPath, [path.join(__dirname, 'prisma-local.cjs'), 'migrate', 'deploy'], { cwd: api, env, stdio: 'inherit', windowsHide: true });
    if (result.error || result.status) throw new Error('Migration deploy failed');
    return;
  }
  throw new Error('Use init/start/status/connect/prepare/deploy/stop');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
