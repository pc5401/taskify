const path = require('node:path');
const source = process.env.TASKIFY_QA_HTTP_SOURCE;
const deps = process.env.TASKIFY_QA_HTTP_DEPS;
if (!source || !deps) throw new Error('Set existing source/apps/api and node_modules paths. No install or PostgreSQL.');
module.exports = {
  rootDir: path.join(source, 'src'),
  testRegex: 'http\\.spec\\.ts$',
  transform: { '^.+\\.ts$': [path.join(deps, 'ts-jest'), { tsconfig: {
    target: 'ES2021', module: 'commonjs', experimentalDecorators: true,
    emitDecoratorMetadata: true, esModuleInterop: true,
    baseUrl: source, paths: { '*': [path.join(deps, '*')] },
    typeRoots: [path.join(deps, '@types')], incremental: false,
  }, diagnostics: true }] },
  modulePaths: [deps], testEnvironment: 'node', cache: false,
  cacheDirectory: path.join(__dirname, '.runtime/http-jest'),
};
