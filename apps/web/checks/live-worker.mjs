import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
const port = process.argv[2];
if (!['3002','3003'].includes(port)) throw new Error('Validation worker port must be3002 or3003');
let config;
try { config=JSON.parse(await readFile(process.env.TASKIFY_LIVE_ENV_FILE,'utf8')); }
catch { throw new Error('Validation environment file unavailable (details suppressed)'); }
const env={...process.env,NODE_ENV:'production'};
for(const name of ['DATABASE_URL','TASKIFY_SESSION_KEY','NEXT_APP_ORIGIN','TASKIFY_API_BASE']) {
  if(typeof config[name]!=='string'||!config[name]) throw new Error(`Validation environment missing ${name}`);
  env[name]=config[name];
}
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',port],{env,stdio:'inherit',windowsHide:true});
process.on('SIGINT',()=>child.kill());process.on('SIGTERM',()=>child.kill());
child.on('exit',code=>{process.exitCode=code??1;});
