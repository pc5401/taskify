const path = require('node:path');
const dependencyRoot = process.env.TASKIFY_QA_DEPENDENCY_ROOT;
if (!dependencyRoot) throw new Error('Set TASKIFY_QA_DEPENDENCY_ROOT to the existing BE-1 apps/api directory. No install or DB required.');
const api = path.resolve(__dirname, '../../../apps/api');
module.exports = {
  rootDir: path.join(api, 'src'),
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.ts$': [path.join(dependencyRoot, 'node_modules/ts-jest'), { tsconfig: path.join(api, 'tsconfig.json'), diagnostics: false }] },
  modulePaths: [path.join(dependencyRoot, 'node_modules')],
  moduleNameMapper: { '^../../generated/client$': path.join(dependencyRoot, 'generated/client') },
  testEnvironment: 'node',
  cache: false,
  cacheDirectory: path.join(__dirname, '.runtime/jest'),
};
