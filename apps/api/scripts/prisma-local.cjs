// Reuse the installed Windows engines rather than downloading them again.
const { spawnSync } = require('node:child_process');
const { join } = require('node:path');
const { existsSync } = require('node:fs');
const root = join(__dirname, '..');
const engines = join(root, 'node_modules', '@prisma', 'engines');
const env = { ...process.env };
if (process.platform === 'win32') {
  const query = join(engines, 'query_engine-windows.dll.node');
  const schema = join(engines, 'schema-engine-windows.exe');
  if (existsSync(query)) env.PRISMA_QUERY_ENGINE_LIBRARY = query;
  if (existsSync(schema)) env.PRISMA_SCHEMA_ENGINE_BINARY = schema;
}
const result = spawnSync(process.execPath, [
  join(root, 'node_modules', 'prisma', 'build', 'index.js'),
  ...process.argv.slice(2),
], { cwd: root, env, stdio: 'inherit' });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
