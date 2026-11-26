// Brevo-shaped HTTPS mail transport against a local mock (TEST ONLY, no real provider is contacted).
// Run (dev mode, override honored): E2E_NO_SINK=1 RABTO_MAIL_PROVIDER=brevo RABTO_MAIL_API_KEY=test-key RABTO_MAIL_FROM_EMAIL=sender@example.test RABTO_MAIL_FROM_NAME=RABTO RABTO_MAIL_API_URL=http://127.0.0.1:4455/v3/smtp/email bash scripts/e2e/run.sh mail2.mjs
import http from 'node:http';
import { execFileSync } from 'node:child_process';
execFileSync('psql',['-d','rabto_e2e','-Atc',"update users set email_verified_at=now() where email='admin@test.local'"]);
const B=process.env.E2E_BASE_URL;let bad=0;const chk=(n,ok,d='')=>{console.log((ok?'PASS ':'FAIL ')+n+(d?' '+d:''));if(!ok)bad=1;};
const seen=[];let mode='ok';
const srv=http.createServer((req,res)=>{let b='';req.on('data',d=>b+=d);req.on('end',()=>{seen.push({h:req.headers,b:b,u:req.url});res.statusCode=mode==='ok'?201:mode==='401'?401:mode==='429'?429:500;res.end('{}');});});
await new Promise(r=>srv.listen(4455,'127.0.0.1',r));
const rq=async()=>{const r=await fetch(B+'/api/auth/password-reset/request',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:'admin@test.local'})});return {s:r.status,t:await r.text()};};
const a=await rq();
if(process.env.E2E_EXPECT_NO_CALL==='1'){await new Promise(r=>setTimeout(r,3000));chk('production ignores the URL override: mock received no request and no key',seen.length===0,'calls '+seen.length);srv.close();console.log(bad?'FAILED':'DONE');process.exit(bad);}
const m=seen[0];let j={};try{j=JSON.parse(m?.b||'{}');}catch{}
chk('request answered ok with provider configured',a.s===200,'status '+a.s);
chk('provider called once with api-key header and Brevo-shaped body',seen.length===1&&m.h['api-key']==='test-key'&&m.u==='/v3/smtp/email'&&j.sender?.email==='sender@example.test'&&j.to?.[0]?.email==='admin@test.local'&&typeof j.subject==='string'&&/\b\d{6}\b/.test(j.textContent||''));
chk('code is not returned in the HTTP response',!/\b\d{6}\b/.test(a.t),a.t.slice(0,80));
mode='fail';const f=await rq();
chk('provider failure does not crash and does not leak the code',f.s>=200&&f.s<600&&!/\b\d{6}\b/.test(f.t),'status '+f.s);
mode='401';const u=await rq();chk('provider 401 does not crash or leak the code',!/\b\d{6}\b/.test(u.t),'status '+u.s);
mode='429';const t=await rq();const before=seen.length;chk('provider 429: no automatic retry (one call per request)',before===seen.length&&!/\b\d{6}\b/.test(t.t),'calls '+before);
srv.close();console.log(bad?'FAILED':'DONE');process.exit(bad);
