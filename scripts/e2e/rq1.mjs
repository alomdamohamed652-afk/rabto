// Admin-assisted recovery queue: abuse-protected, uniform answers, never changes a password.
import fs from 'node:fs'; import { execFileSync } from 'node:child_process';
const B=process.env.E2E_BASE_URL; const SINK=process.env.E2E_MAIL_SINK; const out=[]; let bad=0;
const chk=(k,ok,x='')=>{out.push((ok?'PASS ':'FAIL ')+k+(x?' '+x:''));if(!ok)bad++;};
async function call(path,{method='GET',body,cookie,ip}={}){const r=await fetch(B+path,{method,headers:{...(body?{'content-type':'application/json'}:{}),...(cookie?{cookie}:{}),...(ip?{'x-forwarded-for':ip}:{})},body:body?JSON.stringify(body):undefined});let j=null;try{j=await r.json()}catch{};const sc=r.headers.get('set-cookie');return {s:r.status,j,cookie:sc?sc.split(';')[0]:null};}
const q=(sql)=>execFileSync('psql',['-d','rabto_e2e','-Atc',sql],{encoding:'utf8'}).trim();
const allMails=()=>fs.existsSync(SINK)?fs.readFileSync(SINK,'utf8').trim().split('\n').filter(Boolean).map(l=>JSON.parse(l)):[];
const mails=()=>allMails().filter(x=>!/confirmation code/.test(x.subject||''));
const A=(await call('/api/auth/login',{method:'POST',body:{email:'admin@test.local',password:'Admin-Test-Pass-123'}})).cookie;
const PW='Queue-Test-Pass-1234';
const c=await call('/api/admin/customers',{method:'POST',cookie:A,body:{email:'rq@gmail.com',workspaceName:'Rq co',workspaceSlug:'rq-co',phone:'01044445555'}});
await call('/api/auth/accept-invitation',{method:'POST',body:{token:new URL(c.j.invitation.url).searchParams.get('token'),password:PW}});
const cust=(await call('/api/auth/login',{method:'POST',body:{email:'rq@gmail.com',password:PW},ip:'10.7.0.1'})).cookie;
const hash0=q("select password_hash from users where email='rq@gmail.com'");const epoch0=q("select session_epoch from users where email='rq@gmail.com'");
const R=(phone,note,ip)=>call('/api/auth/recovery-request',{method:'POST',body:{phone,note},ip});
const un=await R('01099990000','x','10.7.1.1');const kn=await R('01044445555','I lost my email access','10.7.1.2');
chk('unknown and known phone get the identical answer',un.s===200&&kn.s===200&&JSON.stringify(un.j)===JSON.stringify(kn.j));
chk('unknown phone stores nothing; known phone stores one open row',q("select count(*) from recovery_requests")==='1'&&q("select status from recovery_requests")==='open');
const dup=await R('01044445555','again','10.7.1.3');
chk('duplicate request keeps one open row, same answer',dup.s===200&&JSON.stringify(dup.j)===JSON.stringify(kn.j)&&q("select count(*) from recovery_requests")==='1');
chk('invalid phone rejected',(await R('abc','x','10.7.1.4')).s===400);
chk('request changes no password, session or mail',q("select password_hash from users where email='rq@gmail.com'")===hash0&&q("select session_epoch from users where email='rq@gmail.com'")===epoch0&&mails().length===0);
chk('customer session still valid after request',(await call('/api/customer/email-verification',{cookie:cust})).s===200);
chk('queue needs admin: anonymous 401, customer 403',(await call('/api/admin/recovery-requests')).s===401&&(await call('/api/admin/recovery-requests',{cookie:cust})).s===403&&(await call('/api/admin/recovery-requests',{method:'PUT',cookie:cust,body:{id:'00000000-0000-0000-0000-000000000000',decision:'resolved'}})).s===403);
const lst=await call('/api/admin/recovery-requests?status=open',{cookie:A});const id=lst.j.requests?.[0]?.id;
chk('admin sees the open request with account email and note',lst.s===200&&lst.j.requests.length===1&&lst.j.requests[0].email==='rq@gmail.com'&&lst.j.requests[0].note==='I lost my email access');
chk('invalid decision and bad id rejected',(await call('/api/admin/recovery-requests',{method:'PUT',cookie:A,body:{id,decision:'reset_now'}})).s===400&&(await call('/api/admin/recovery-requests',{method:'PUT',cookie:A,body:{id:'nope',decision:'resolved'}})).s===400);
const dec=await call('/api/admin/recovery-requests',{method:'PUT',cookie:A,body:{id,decision:'resolved',note:'called customer'}});
chk('admin decision recorded with audit row, password untouched',dec.s===200&&q("select status from recovery_requests")==='resolved'&&q("select count(*) from audit_logs where action in ('recovery_request.created','recovery_request.resolved')")==='2'&&q("select password_hash from users where email='rq@gmail.com'")===hash0);
const again=await R('01044445555','y'.repeat(900),'10.7.1.5');
chk('after a decision a new request can be opened',again.s===200&&q("select count(*) from recovery_requests where status='open'")==='1');
let n429=0;for(let i=0;i<5;i++){const x=await R('01044445555','x','10.7.2.'+i);if(x.s===429)n429++;}
chk('per-phone limit (3/hour) returns 429',n429>=1,'429s '+n429);
const long=await call('/api/admin/recovery-requests',{cookie:A});
chk('note length capped at 500',Math.max(...long.j.requests.map(r=>(r.note||'').length))<=500);
console.log(out.join('\n'));process.exit(bad?1:0);
