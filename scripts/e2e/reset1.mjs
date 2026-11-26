// Email OTP password reset against the isolated DB and the local mail sink file (TEST ONLY).
import fs from 'node:fs'; import { execFileSync } from 'node:child_process';
const B=process.env.E2E_BASE_URL; const SINK=process.env.E2E_MAIL_SINK; const out=[]; let bad=0;
const chk=(k,ok,x='')=>{out.push((ok?'PASS ':'FAIL ')+k+(x?' '+x:''));if(!ok)bad++;};
async function call(path,{method='GET',body,cookie,ip}={}){const r=await fetch(B+path,{method,headers:{...(body?{'content-type':'application/json'}:{}),...(cookie?{cookie}:{}),...(ip?{'x-forwarded-for':ip}:{})},body:body?JSON.stringify(body):undefined});let j=null;try{j=await r.json()}catch{};const sc=r.headers.get('set-cookie');return {s:r.status,j,cookie:sc?sc.split(';')[0]:null};}
const q=(sql)=>execFileSync('psql',['-d','rabto_e2e','-Atc',sql],{encoding:'utf8'}).trim();
const mails=()=>fs.existsSync(SINK)?fs.readFileSync(SINK,'utf8').trim().split('\n').filter(Boolean).map(l=>JSON.parse(l)):[];
const lastCode=(to)=>{const m=mails().filter(x=>x.to===to).pop();return m&&m.text.match(/\b(\d{6})\b/)?.[1];};
let r=await call('/api/auth/login',{method:'POST',body:{email:'admin@test.local',password:'Admin-Test-Pass-123'}});const A=r.cookie;
r=await call('/api/admin/customers',{method:'POST',cookie:A,body:{email:'rs-a@test.local',workspaceName:'Rs a',workspaceSlug:'rs-a'}});
const tok=new URL(r.j.invitation.url).searchParams.get('token');await call('/api/auth/accept-invitation',{method:'POST',body:{token:tok,password:'Old-Password-1234'}});
const E='rs-a@test.local';
const u1=await call('/api/auth/password-reset/request',{method:'POST',body:{email:E},ip:'10.1.1.1'});
const u2=await call('/api/auth/password-reset/request',{method:'POST',body:{email:'nobody@test.local'},ip:'10.1.1.2'});
chk('uniform response known vs unknown email',u1.s===200&&u2.s===200&&JSON.stringify(u1.j)===JSON.stringify(u2.j));
chk('mail sent only for the real account',mails().length===1&&mails()[0].to===E);
chk('invalid email shape rejected',(await call('/api/auth/password-reset/request',{method:'POST',body:{email:'x'}})).s===400);
const code=lastCode(E);chk('code is 6 digits',/^\d{6}$/.test(code||''));
chk('code stored hashed, not plain',q("select count(*) from password_reset_codes where code_hash='"+code+"'")==='0'&&q("select length(code_hash) from password_reset_codes limit 1")==='64');
const wrong=code==='000000'?'111111':'000000';
const NP='New-Password-5678-x';
chk('wrong code rejected',(await call('/api/auth/password-reset/confirm',{method:'POST',body:{email:E,code:wrong,password:NP},ip:'10.2.2.2'})).s===400);
chk('old password still works after wrong code',(await call('/api/auth/login',{method:'POST',body:{email:E,password:'Old-Password-1234'},ip:'10.3.3.3'})).s===200);
chk('short new password rejected, code kept',(await call('/api/auth/password-reset/confirm',{method:'POST',body:{email:E,code,password:'short'},ip:'10.2.2.2'})).s===400);
chk('unknown email confirm looks the same as wrong code',(await call('/api/auth/password-reset/confirm',{method:'POST',body:{email:'nobody@test.local',code,password:NP},ip:'10.2.2.3'})).j?.error==='The code is invalid or expired.');
const ok=await call('/api/auth/password-reset/confirm',{method:'POST',body:{email:E,code,password:NP},ip:'10.2.2.2'});chk('correct code resets password',ok.s===200,JSON.stringify(ok.j));
chk('new password logs in',(await call('/api/auth/login',{method:'POST',body:{email:E,password:NP},ip:'10.3.3.4'})).s===200);
chk('old password no longer works',(await call('/api/auth/login',{method:'POST',body:{email:E,password:'Old-Password-1234'},ip:'10.3.3.5'})).s===401);
chk('code is single use',(await call('/api/auth/password-reset/confirm',{method:'POST',body:{email:E,code,password:'Another-Pass-9999'},ip:'10.2.2.2'})).s===400);
// attempts cap: after 5 wrong attempts even the right code fails
await call('/api/auth/password-reset/request',{method:'POST',body:{email:E},ip:'10.1.1.3'});const code2=lastCode(E);const w2=code2==='000000'?'111111':'000000';
for(let i=0;i<5;i++)await call('/api/auth/password-reset/confirm',{method:'POST',body:{email:E,code:w2,password:NP},ip:'10.4.4.'+i});
chk('after 5 wrong attempts the right code is rejected',(await call('/api/auth/password-reset/confirm',{method:'POST',body:{email:E,code:code2,password:'Third-Pass-0000-z'},ip:'10.4.4.9'})).s===400);
// expiry
await call('/api/auth/password-reset/request',{method:'POST',body:{email:E},ip:'10.1.1.4'});const code3=lastCode(E);
q("update password_reset_codes set expires_at=now()-interval '1 minute' where used_at is null");
chk('expired code rejected',(await call('/api/auth/password-reset/confirm',{method:'POST',body:{email:E,code:code3,password:'Fourth-Pass-1111-z'},ip:'10.5.5.5'})).s===400);
// new request invalidates earlier unused code
await call('/api/auth/password-reset/request',{method:'POST',body:{email:E},ip:'10.1.1.5'});const c4=lastCode(E);await call('/api/auth/password-reset/request',{method:'POST',body:{email:E},ip:'10.1.1.6'});const c5=lastCode(E);
chk('older code invalidated by a newer one',c4===c5||(await call('/api/auth/password-reset/confirm',{method:'POST',body:{email:E,code:c4,password:'Fifth-Pass-2222-zz'},ip:'10.5.5.6'})).s===400);
// request rate limit: per email 5/hour then silently no more mail (still uniform)
const before=mails().length;for(let i=0;i<4;i++)await call('/api/auth/password-reset/request',{method:'POST',body:{email:E},ip:'10.6.6.'+i});
const lim=await call('/api/auth/password-reset/request',{method:'POST',body:{email:E},ip:'10.6.6.9'});
chk('rate limit: still uniform 200, no extra mail once limited',lim.s===200&&mails().length<before+5,'mails added '+(mails().length-before));
chk('audit rows requested+completed',Number(q("select count(*) from audit_logs where action='password_reset.requested'"))>=3&&q("select count(*) from audit_logs where action='password_reset.completed'")==='1');
chk('no plain code or password in audit details',q("select count(*) from audit_logs where details::text like '%"+code+"%' or details::text like '%New-Password%'")==='0');
chk('invited-but-no-password account gets no mail',await (async()=>{const x=await call('/api/admin/customers',{method:'POST',cookie:A,body:{email:'rs-np@test.local',workspaceName:'Rs np',workspaceSlug:'rs-np'}});const n=mails().length;await call('/api/auth/password-reset/request',{method:'POST',body:{email:'rs-np@test.local'},ip:'10.7.7.7'});return x.s===201&&mails().length===n;})());
console.log(out.join('\n'));process.exit(bad?1:0);
