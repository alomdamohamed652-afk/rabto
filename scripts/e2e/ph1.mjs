// Customer self phone change: re-auth, collision, audit, rate limit, login with new phone.
import fs from 'node:fs'; import { execFileSync } from 'node:child_process';
const B=process.env.E2E_BASE_URL; const SINK=process.env.E2E_MAIL_SINK; const out=[]; let bad=0;
const chk=(k,ok,x='')=>{out.push((ok?'PASS ':'FAIL ')+k+(x?' '+x:''));if(!ok)bad++;};
async function call(path,{method='GET',body,cookie,ip}={}){const r=await fetch(B+path,{method,headers:{...(body?{'content-type':'application/json'}:{}),...(cookie?{cookie}:{}),...(ip?{'x-forwarded-for':ip}:{})},body:body?JSON.stringify(body):undefined});let j=null;try{j=await r.json()}catch{};const sc=r.headers.get('set-cookie');return {s:r.status,j,cookie:sc?sc.split(';')[0]:null};}
const q=(sql)=>execFileSync('psql',['-d','rabto_e2e','-Atc',sql],{encoding:'utf8'}).trim();
const allMails=()=>fs.existsSync(SINK)?fs.readFileSync(SINK,'utf8').trim().split('\n').filter(Boolean).map(l=>JSON.parse(l)):[];
const A=(await call('/api/auth/login',{method:'POST',body:{email:'admin@test.local',password:'Admin-Test-Pass-123'}})).cookie;
const PW='Self-Phone-Pass-1234';
const mk=async(email,slug,phone)=>{const r=await call('/api/admin/customers',{method:'POST',cookie:A,body:{email,workspaceName:slug,workspaceSlug:slug,phone}});await call('/api/auth/accept-invitation',{method:'POST',body:{token:new URL(r.j.invitation.url).searchParams.get('token'),password:PW}});return (await call('/api/auth/login',{method:'POST',body:{email,password:PW},ip:'10.9.'+slug.length+'.1'})).cookie;};
const C1=await mk('sp1@gmail.com','sp-one','01011110001');const C2=await mk('sp2@gmail.com','sp-two','01011110002');
const P=(cookie,b)=>call('/api/customer/phone',{method:'PUT',cookie,body:b});
chk('needs a session',(await P(undefined,{phone:'01077770000',password:PW})).s===401&&(await call('/api/customer/phone')).s===401);
chk('GET shows only the last 3 digits',(await call('/api/customer/phone',{cookie:C1})).j.phoneTail==='***001');
chk('invalid phone 400, missing password 400',(await P(C1,{phone:'abc',password:PW})).s===400&&(await P(C1,{phone:'01077770000'})).s===400);
chk('collision with another account refused, nothing changed',(await P(C1,{phone:'01011110002',password:PW})).s===409&&q("select phone from users where email='sp1@gmail.com'")==='+201011110001');
chk('wrong password refused, phone unchanged',(await P(C1,{phone:'01077770000',password:'Wrong-Password-99'})).s===403&&q("select phone from users where email='sp1@gmail.com'")==='+201011110001');
const ok=await P(C1,{phone:'01077770000',password:PW});
chk('correct password changes the phone',ok.s===200&&q("select phone from users where email='sp1@gmail.com'")==='+201077770000'&&ok.j.phoneTail==='***000');
chk('audit row records self change with masked tails only',q("select details::text from audit_logs where action='user.phone_changed' order by created_at desc limit 1").includes('"by": "self"')&&!q("select details::text from audit_logs where action='user.phone_changed' order by created_at desc limit 1").includes('0777770'));
chk('login works with the new phone, not the old one',(await call('/api/auth/login',{method:'POST',body:{email:'01077770000',password:PW},ip:'10.9.9.1'})).s===200&&(await call('/api/auth/login',{method:'POST',body:{email:'01011110001',password:PW},ip:'10.9.9.2'})).s===401);
chk('current session stays valid (policy: phone change does not revoke sessions)',(await call('/api/customer/phone',{cookie:C1})).s===200);
let w=0;for(let i=0;i<7;i++){const x=await P(C2,{phone:'01088880000',password:'Wrong-Password-'+i});if(x.s===429)w++;}
chk('repeated wrong passwords lock further attempts (429), even with the right password',w>=1&&(await P(C2,{phone:'01088880000',password:PW})).s===429&&q("select phone from users where email='sp2@gmail.com'")==='+201011110002','429s '+w);
console.log(out.join('\n'));process.exit(bad?1:0);
