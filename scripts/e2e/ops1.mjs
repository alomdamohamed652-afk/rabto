// Health endpoint plus backup and restore-verify scripts against the throwaway test database (TEST ONLY).
import { execFileSync } from 'node:child_process';import fs from 'node:fs';
const B=process.env.E2E_BASE_URL;let bad=0;const chk=(n,ok,d='')=>{console.log((ok?'PASS ':'FAIL ')+n+(d?' '+d:''));if(!ok)bad=1;};
const q=(s,db='rabto_e2e')=>execFileSync('psql',['-d',db,'-Atc',s],{encoding:'utf8'}).trim();
const h=await fetch(B+'/api/health');const hj=await h.json();
chk('health endpoint answers ok with no details',h.status===200&&JSON.stringify(hj)==='{"ok":true}'&&h.headers.get('cache-control')==='no-store');
const dir='/tmp/ops1-'+process.pid;
const env={...process.env,PGDATABASE:'rabto_e2e'};
const f1=execFileSync('bash',['../ops/backup.sh',dir,'2'],{env,encoding:'utf8'}).trim();
chk('backup writes a non-empty dump with mode 600',fs.statSync(f1).size>1000&&(fs.statSync(f1).mode&0o777)===0o600);
await new Promise(r=>setTimeout(r,1100));execFileSync('bash',['../ops/backup.sh',dir,'2'],{env});await new Promise(r=>setTimeout(r,1100));execFileSync('bash',['../ops/backup.sh',dir,'2'],{env});
chk('retention keeps only the newest 2 dumps',fs.readdirSync(dir).filter(x=>x.endsWith('.dump')).length===2);
const dump=fs.readdirSync(dir).filter(x=>x.endsWith('.dump')).map(x=>dir+'/'+x).pop();
const out=execFileSync('bash',['../ops/restore-verify.sh',dump,'restore_check_t1'],{env,encoding:'utf8'});
const live=q("select count(*) from users");const rest=(out.match(/^users=(\d+)$/m)||[])[1];
chk('restore into a scratch database reproduces the users row count',live===rest,'live '+live+' restored '+rest);
chk('scratch database is dropped afterwards',q("select count(*) from pg_database where datname='restore_check_t1'",'postgres')==='0');
let refused=false;try{execFileSync('bash',['../ops/restore-verify.sh',dump,'rabto_e2e'],{env,stdio:'pipe'});}catch{refused=true;}
chk('restore-verify refuses a non-scratch database name',refused&&q("select count(*) from users")===live);
fs.rmSync(dir,{recursive:true,force:true});
console.log(bad?'FAILED':'DONE');process.exit(bad);
