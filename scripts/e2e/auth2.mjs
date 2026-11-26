// Session epoch, concurrent OTP replay, phone+password login (isolated DB, test sink).
import fs from 'node:fs'; import { execFileSync } from 'node:child_process';
const B=process.env.E2E_BASE_URL; const SINK=process.env.E2E_MAIL_SINK; const out=[]; let bad=0;
const chk=(k,ok,x='')=>{out.push((ok?'PASS ':'FAIL ')+k+(x?' '+x:''));if(!ok)bad++;};
async function call(path,{method='GET',body,cookie,ip}={}){const r=await fetch(B+path,{method,headers:{...(body?{'content-type':'application/json'}:{}),...(cookie?{cookie}:{}),...(ip?{'x-forwarded-for':ip}:{})},body:body?JSON.stringify(body):undefined});let j=null;try{j=await r.json()}catch{};const sc=r.headers.get('set-cookie');return {s:r.status,j,cookie:sc?sc.split(';')[0]:null};}
const q=(sql)=>execFileSync('psql',['-d','rabto_e2e','-Atc',sql],{encoding:'utf8'}).trim();
const mails=()=>fs.existsSync(SINK)?fs.readFileSync(SINK,'utf8').trim().split('\n').filter(Boolean).map(l=>JSON.parse(l)):[];
const lastCode=(to)=>{const m=mails().filter(x=>x.to===to).pop();return m&&m.text.match(/\b(\d{6})\b/)?.[1];};
const ADM=await call('/api/auth/login',{method:'POST',body:{email:'admin@test.local',password:'Admin-Test-Pass-123'}});const A=ADM.cookie;
const mk=async(email,slug,phone,pw)=>{const r=await call('/api/admin/customers',{method:'POST',cookie:A,body:{email,workspaceName:slug,workspaceSlug:slug,phone}});if(r.s!==200&&r.s!==201)return r;const tok=new URL(r.j.invitation.url).searchParams.get('token');await call('/api/auth/accept-invitation',{method:'POST',body:{token:tok,password:pw}});return r;};
const PW='Phone-Pass-12345';
const c1=await mk('ph-a@test.local','ph-a','010 1234 5678',PW);chk('customer with phone created',c1.s<300,JSON.stringify(c1.j).slice(0,120));
chk('phone stored canonical E.164',q("select phone from users where email='ph-a@test.local'")==='+201012345678');
const dup=await call('/api/admin/customers',{method:'POST',cookie:A,body:{email:'ph-b@test.local',workspaceName:'ph-b',workspaceSlug:'ph-b',phone:'+20 101-234-5678'}});
chk('same number in another format rejected',dup.s>=400,String(dup.s));
chk('no user/workspace left by the rejected duplicate',q("select count(*) from users where email='ph-b@test.local'")==='0'&&q("select count(*) from workspaces where slug='ph-b'")==='0');
chk('invalid phone rejected',(await call('/api/admin/customers',{method:'POST',cookie:A,body:{email:'ph-c@test.local',workspaceName:'ph-c',workspaceSlug:'ph-c',phone:'12345'}})).s>=400);
chk('customer without phone still works',(await mk('ph-n@test.local','ph-n',undefined,PW)).s<300&&q("select phone is null from users where email='ph-n@test.local'")==='t');
for(const [k,id] of [['phone local format','01012345678'],['phone +E164','+201012345678'],['phone with spaces','+20 101 234 5678'],['email','ph-a@test.local'],['email uppercase','PH-A@test.local']]){const r=await call('/api/auth/login',{method:'POST',body:{email:id,password:PW},ip:'10.9.0.'+Math.floor(Math.random()*200)});chk('login by '+k,r.s===200&&!!r.cookie);}
chk('wrong password by phone fails',(await call('/api/auth/login',{method:'POST',body:{email:'01012345678',password:'Wrong-Password-1'},ip:'10.9.1.1'})).s===401);
const u1=await call('/api/auth/login',{method:'POST',body:{email:'01099999999',password:PW},ip:'10.9.1.2'});const u2=await call('/api/auth/login',{method:'POST',body:{email:'01012345678',password:'Wrong-Password-1'},ip:'10.9.1.3'});
chk('unknown phone and wrong password look identical',u1.s===401&&u2.s===401&&JSON.stringify(u1.j)===JSON.stringify(u2.j));
chk('garbage identifier rejected as invalid credentials',(await call('/api/auth/login',{method:'POST',body:{email:'not a thing',password:PW},ip:'10.9.1.4'})).s===401);
let bf=0,be=0;for(let i=0;i<14;i++){const r2=await call('/api/auth/login',{method:'POST',body:{email:'ph-n@test.local',password:'Bad-Password-'+i+'xx'},ip:'10.9.2.2'});if(r2.s===429)be++;const r=await call('/api/auth/login',{method:'POST',body:{email:'01012345678',password:'Bad-Password-'+i+'xx'},ip:'10.9.2.1'});if(r.s===429)bf++;}
chk('phone failures are counted and behave like email failures',bf===be&&Number(q("select count(*) from login_attempts where failed_count>=10"))>=2,'phone 429s '+bf+' email 429s '+be);
// session epoch
const E='ph-a@test.local';
const old=await call('/api/auth/login',{method:'POST',body:{email:E,password:PW},ip:'10.8.0.1'});const OC=old.cookie;
const WS=q("select w.id from workspaces w where w.slug='ph-a'");const pl=await call('/api/customer/plan?workspaceId='+WS,{cookie:OC});chk('session valid before reset',pl.s===200,String(pl.s)+' '+JSON.stringify(pl.j).slice(0,80));
await call('/api/auth/password-reset/request',{method:'POST',body:{email:E},ip:'10.8.1.1'});const code=lastCode(E);
const NP='Epoch-New-Pass-777';
const par=await Promise.all([1,2,3,4].map(i=>call('/api/auth/password-reset/confirm',{method:'POST',body:{email:E,code,password:NP+i},ip:'10.8.2.'+i})));
chk('concurrent replay of one code: exactly one success',par.filter(x=>x.s===200).length===1,par.map(x=>x.s).join(','));
chk('epoch incremented exactly once',q("select session_epoch from users where email='"+E+"'")==='1');
chk('old session rejected after reset',(await call('/api/customer/plan?workspaceId='+WS,{cookie:OC})).s===401);
const winner=par.findIndex(x=>x.s===200)+1;
const nl=await call('/api/auth/login',{method:'POST',body:{email:'01012345678',password:NP+winner},ip:'10.8.3.1'});
chk('new login (by phone) works with new password',nl.s===200);
chk('new session valid',(await call('/api/customer/plan?workspaceId='+WS,{cookie:nl.cookie})).s===200);
chk('login with a loser password fails',(await call('/api/auth/login',{method:'POST',body:{email:E,password:NP+(winner%4+1)},ip:'10.8.3.2'})).s===401);
chk('admin session unaffected',(await call('/api/admin/plans',{cookie:A})).s===200);
console.log(out.join('\n'));process.exit(bad?1:0);
