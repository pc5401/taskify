// Reuse the installed Windows engines rather than downloading them again.
const { spawnSync } = require('node:child_process');
const { join } = require('node:path');
const { existsSync, readFileSync, writeFileSync, mkdirSync, unlinkSync } = require('node:fs');
const root = join(__dirname, '..');
const dependencies = process.env.TASKIFY_API_DEPENDENCIES || join(root, 'node_modules');
const engines = join(dependencies, '@prisma', 'engines');
const env = { ...process.env };
env.PRISMA_GENERATE_SKIP_AUTOINSTALL = '1';
let args = process.argv.slice(2);
let temporarySchema;
if (args[0] === 'generate' && process.env.TASKIFY_API_DEPENDENCIES) {
  const runtime = join(root, '.runtime');
  mkdirSync(runtime, { recursive: true });
  temporarySchema = join(runtime, 'schema.prisma');
  const generator = join(dependencies, '@prisma', 'client', 'generator-build', 'index.js').replace(/\\/g, '/');
  const output = join(root, 'generated', 'client').replace(/\\/g, '/');
  const source = readFileSync(join(root, 'prisma', 'schema.prisma'), 'utf8')
    .replace('provider = "prisma-client-js"', `provider = "node ${generator}"`)
    .replace('output   = "../generated/client"', `output   = "${output}"`);
  writeFileSync(temporarySchema, source);
  args = [...args, '--schema', temporarySchema];
}
if (process.platform === 'win32') {
  const query = join(engines, 'query_engine-windows.dll.node');
  const schema = join(engines, 'schema-engine-windows.exe');
  if (existsSync(query)) env.PRISMA_QUERY_ENGINE_LIBRARY = query;
  if (existsSync(schema)) env.PRISMA_SCHEMA_ENGINE_BINARY = schema;
}
const result = spawnSync(process.execPath, [
  join(dependencies, 'prisma', 'build', 'index.js'),
  ...args,
], { cwd: root, env, stdio: 'inherit' });
if (result.error) throw result.error;
if (temporarySchema) unlinkSync(temporarySchema);
process.exit(result.status ?? 1);
