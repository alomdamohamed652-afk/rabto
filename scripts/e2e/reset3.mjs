// Reset by phone: phone -> masked email -> typed full email -> code (test sink, dev mode).
import fs from 'node:fs'; import { execFileSync } from 'node:child_process';
const B=process.env.E2E_BASE_URL; const SINK=process.env.E2E_MAIL_SINK; const out=[]; let bad=0;
const chk=(k,ok,x='')=>{out.push((ok?'PASS ':'FAIL ')+k+(x?' '+x:''));if(!ok)bad++;};
async function call(path,{method='GET',body,cookie,ip}={}){const r=await fetch(B+path,{method,headers:{...(body?{'content-type':'application/json'}:{}),...(cookie?{cookie}:{}),...(ip?{'x-forwarded-for':ip}:{})},body:body?JSON.stringify(body):undefined});let j=null;try{j=await r.json()}catch{};const sc=r.headers.get('set-cookie');return {s:r.status,j,cookie:sc?sc.split(';')[0]:null};}
const q=(sql)=>execFileSync('psql',['-d','rabto_e2e','-Atc',sql],{encoding:'utf8'}).trim();
const mails=()=>fs.existsSync(SINK)?fs.readFileSync(SINK,'utf8').trim().split('\n').filter(Boolean).map(l=>JSON.parse(l)):[];
const lastCode=(to)=>{const m=mails().filter(x=>x.to===to).pop();return m&&m.text.match(/\b(\d{6})\b/)?.[1];};
const A=(await call('/api/auth/login',{method:'POST',body:{email:'admin@test.local',password:'Admin-Test-Pass-123'}})).cookie;
const PW='Phone-Reset-12345';
const r=await call('/api/admin/customers',{method:'POST',cookie:A,body:{email:'ahmed@gmail.com',workspaceName:'Ahmed co',workspaceSlug:'ahmed-co',phone:'01022223333'}});
await call('/api/auth/accept-invitation',{method:'POST',body:{token:new URL(r.j.invitation.url).searchParams.get('token'),password:PW}});
const L=(phone,ip)=>call('/api/auth/password-reset/lookup',{method:'POST',body:{phone},ip});
const k=await L('01022223333','10.1.0.1'),u=await L('01099990000','10.1.0.2'),u2=await L('01099990000','10.1.0.3');
chk('known phone returns masked email',k.s===200&&k.j.maskedEmail==='a***@g***.com',JSON.stringify(k.j));
chk('unknown phone returns same-shaped mask',u.s===200&&/^[a-z]\*\*\*@[a-z]\*\*\*\.[a-z]+$/.test(u.j.maskedEmail),JSON.stringify(u.j));
chk('decoy is stable per phone',u.j.maskedEmail===u2.j.maskedEmail);
chk('lookup sends nothing',mails().length===0);
chk('invalid phone rejected',(await L('123','10.1.0.4')).s===400);
const E='ahmed@gmail.com';
chk('right phone + wrong email: uniform answer, no mail',(await call('/api/auth/password-reset/request',{method:'POST',body:{phone:'01022223333',email:'other@gmail.com'},ip:'10.2.0.1'})).s===200&&mails().length===0);
chk('wrong phone + right email: uniform answer, no mail',(await call('/api/auth/password-reset/request',{method:'POST',body:{phone:'01011112222',email:E},ip:'10.2.0.2'})).s===200&&mails().length===0);
chk('right phone + right email: code mailed to that email only',(await call('/api/auth/password-reset/request',{method:'POST',body:{phone:'+20 102 222 3333',email:E},ip:'10.2.0.3'})).s===200&&mails().length===1&&mails()[0].to===E);
const code=lastCode(E);const NP='Phone-New-Pass-4321x';
chk('code resets the password',(await call('/api/auth/password-reset/confirm',{method:'POST',body:{email:E,code,password:NP},ip:'10.2.0.4'})).s===200&&(await call('/api/auth/login',{method:'POST',body:{email:'01022223333',password:NP},ip:'10.2.0.5'})).s===200);
let lim=0;for(let i=0;i<8;i++){const x=await L('01077778888','10.3.0.'+i);if(x.s===429)lim++;}
chk('phone lookup rate limited per phone (5/hour)',lim>=3,'429s '+lim);
let ipl=0;for(let i=0;i<30;i++){const x=await L('0105555'+String(1000+i),'10.4.0.1');if(x.s===429)ipl++;}
chk('phone lookup rate limited per IP (20/hour)',ipl>=8,'429s '+ipl);
console.log(out.join('\n'));process.exit(bad?1:0);
