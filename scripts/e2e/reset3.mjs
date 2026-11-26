// Reset by phone: phone -> masked email -> typed full email -> code (test sink, dev mode).
import fs from 'node:fs'; import { execFileSync } from 'node:child_process';
const B=process.env.E2E_BASE_URL; const SINK=process.env.E2E_MAIL_SINK; const out=[]; let bad=0;
const chk=(k,ok,x='')=>{out.push((ok?'PASS ':'FAIL ')+k+(x?' '+x:''));if(!ok)bad++;};
async function call(path,{method='GET',body,cookie,ip}={}){const r=await fetch(B+path,{method,headers:{...(body?{'content-type':'application/json'}:{}),...(cookie?{cookie}:{}),...(ip?{'x-forwarded-for':ip}:{})},body:body?JSON.stringify(body):undefined});let j=null;try{j=await r.json()}catch{};const sc=r.headers.get('set-cookie');return {s:r.status,j,cookie:sc?sc.split(';')[0]:null};}
const q=(sql)=>execFileSync('psql',['-d','rabto_e2e','-Atc',sql],{encoding:'utf8'}).trim();
const allMails=()=>fs.existsSync(SINK)?fs.readFileSync(SINK,'utf8').trim().split('\n').filter(Boolean).map(l=>JSON.parse(l)):[];
const mails=()=>allMails().filter(x=>!/confirmation code/.test(x.subject||''));
const verifyMail=async(email,pw)=>{const lg=await call('/api/auth/login',{method:'POST',body:{email,password:pw},ip:'10.99.'+Math.floor(Math.random()*250)+'.'+Math.floor(Math.random()*250)});const cookie=lg.cookie;const r1=await call('/api/customer/email-verification',{method:'POST',cookie});const m=allMails().filter(x=>x.to===email&&/confirmation code/.test(x.subject||'')).pop();const c=m&&m.text.match(/\b(\d{6})\b/)?.[1];const r2=await call('/api/customer/email-verification',{method:'PUT',cookie,body:{code:c}});return r1.s===200&&r2.s===200;};
const lastCode=(to)=>{const m=mails().filter(x=>x.to===to).pop();return m&&m.text.match(/\b(\d{6})\b/)?.[1];};
const A=(await call('/api/auth/login',{method:'POST',body:{email:'admin@test.local',password:'Admin-Test-Pass-123'}})).cookie;
const PW='Phone-Reset-12345';
const r=await call('/api/admin/customers',{method:'POST',cookie:A,body:{email:'ahmed@gmail.com',workspaceName:'Ahmed co',workspaceSlug:'ahmed-co',phone:'01022223333'}});
await call('/api/auth/accept-invitation',{method:'POST',body:{token:new URL(r.j.invitation.url).searchParams.get('token'),password:PW}});
chk('mailbox verified by real mailed code',await verifyMail('ahmed@gmail.com',PW));
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
// unverified mailbox: no mask truth, no code
const r2=await call('/api/admin/customers',{method:'POST',cookie:A,body:{email:'unv@gmail.com',workspaceName:'Unv co',workspaceSlug:'unv-co',phone:'01033334444'}});
await call('/api/auth/accept-invitation',{method:'POST',body:{token:new URL(r2.j.invitation.url).searchParams.get('token'),password:PW}});
const before=mails().length;
const uv=await L('01033334444','10.5.0.1');chk('unverified account: lookup returns a decoy, not its real mask',uv.s===200&&uv.j.maskedEmail!=='u***@g***.com',JSON.stringify(uv.j));
await call('/api/auth/password-reset/request',{method:'POST',body:{email:'unv@gmail.com'},ip:'10.5.0.2'});await call('/api/auth/password-reset/request',{method:'POST',body:{phone:'01033334444',email:'unv@gmail.com'},ip:'10.5.0.3'});
chk('unverified account: no code mailed by email or phone path',mails().length===before);
chk('verification needs a session',(await call('/api/customer/email-verification',{method:'POST'})).s===401&&(await call('/api/customer/email-verification',{method:'PUT',body:{code:'123456'}})).s===401);
const ul=await call('/api/auth/login',{method:'POST',body:{email:'unv@gmail.com',password:PW},ip:'10.6.0.1'});
await call('/api/customer/email-verification',{method:'POST',cookie:ul.cookie});const vc=allMails().filter(x=>x.to==='unv@gmail.com'&&/confirmation code/.test(x.subject||'')).pop().text.match(/\b(\d{6})\b/)[1];
chk('wrong verification code rejected',(await call('/api/customer/email-verification',{method:'PUT',cookie:ul.cookie,body:{code:vc==='000000'?'111111':'000000'}})).s===400&&q("select email_verified_at is null from users where email='unv@gmail.com'")==='t');
chk('verification code is not accepted as a reset code',(await call('/api/auth/password-reset/confirm',{method:'POST',body:{email:'unv@gmail.com',code:vc,password:'Cross-Use-Pass-1234'},ip:'10.6.0.2'})).s===400);
chk('correct verification code verifies once',(await call('/api/customer/email-verification',{method:'PUT',cookie:ul.cookie,body:{code:vc}})).s===200&&q("select email_verified_at is not null from users where email='unv@gmail.com'")==='t'&&(await call('/api/customer/email-verification',{method:'PUT',cookie:ul.cookie,body:{code:vc}})).s===400);
chk('verification audit rows',q("select count(*) from audit_logs where action='email_verification.confirmed'")>='2');
const before2=mails().length;
await call('/api/auth/password-reset/request',{method:'POST',body:{email:'unv@gmail.com'},ip:'10.5.0.4'});
q("delete from login_attempts where key_type='pwreset_ip'");const rr=await call('/api/auth/password-reset/request',{method:'POST',body:{email:'unv@gmail.com'},ip:'10.5.0.9'});chk('after real verification a reset code is mailed',mails().length===before2+1,JSON.stringify(rr)+' '+before2+' '+mails().length);
let lim=0;for(let i=0;i<8;i++){const x=await L('01077778888','10.3.0.'+i);if(x.s===429)lim++;}
chk('phone lookup rate limited per phone (5/hour)',lim>=3,'429s '+lim);
let ipl=0;for(let i=0;i<30;i++){const x=await L('0105555'+String(1000+i),'10.4.0.1');if(x.s===429)ipl++;}
chk('phone lookup rate limited per IP (20/hour)',ipl>=8,'429s '+ipl);
console.log(out.join('\n'));process.exit(bad?1:0);
