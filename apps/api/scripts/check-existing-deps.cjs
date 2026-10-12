// Reuse an existing dependency directory read-only. Outputs stay in this checkout.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const deps = process.env.TASKIFY_API_DEPENDENCIES;
if (!deps) throw new Error('Set TASKIFY_API_DEPENDENCIES to an existing node_modules directory');
const runtime = path.join(root, '.runtime');
fs.mkdirSync(runtime, { recursive: true });
const config = path.join(runtime, 'tsconfig.json');
fs.writeFileSync(config, JSON.stringify({ extends: '../tsconfig.build.json', compilerOptions: {
  baseUrl: '..', paths: { '*': [path.join(deps, '*')] }, typeRoots: [path.join(deps, '@types')],
  outDir: '../dist', incremental: false,
}, include: ['../src/**/*.ts'], exclude: ['../src/**/*.spec.ts', '../test', '../dist'] }));
const env = { ...process.env, NODE_PATH: deps, TEMP: runtime, TMP: runtime };
const run = (file, args) => {
  const result = spawnSync(process.execPath, [path.join(deps, file), ...args], { cwd: root, env, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status) process.exit(result.status);
};
run('typescript/bin/tsc', ['-p', config]);
const jestConfig = {
  rootDir: path.join(root, 'src'), testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.ts$': [path.join(deps, 'ts-jest'), { tsconfig: { ...JSON.parse(fs.readFileSync(config)).compilerOptions,
    experimentalDecorators: true, emitDecoratorMetadata: true, target: 'ES2021', module: 'commonjs', esModuleInterop: true,
    baseUrl: root, outDir: undefined, incremental: false } }] },
  modulePaths: [deps], testEnvironment: 'node', cache: false, cacheDirectory: path.join(runtime, 'jest'),
};
run('jest/bin/jest.js', ['--config', JSON.stringify(jestConfig), '--runInBand', '--watch=false']);
