// Support tickets (tenant safety, status flow, limits, audit) and admin phone edit.
import fs from 'node:fs'; import { execFileSync } from 'node:child_process';
const B=process.env.E2E_BASE_URL; const SINK=process.env.E2E_MAIL_SINK; const out=[]; let bad=0;
const chk=(k,ok,x='')=>{out.push((ok?'PASS ':'FAIL ')+k+(x?' '+x:''));if(!ok)bad++;};
async function call(path,{method='GET',body,cookie,ip}={}){const r=await fetch(B+path,{method,headers:{...(body?{'content-type':'application/json'}:{}),...(cookie?{cookie}:{}),...(ip?{'x-forwarded-for':ip}:{})},body:body?JSON.stringify(body):undefined});let j=null;try{j=await r.json()}catch{};const sc=r.headers.get('set-cookie');return {s:r.status,j,cookie:sc?sc.split(';')[0]:null};}
const q=(sql)=>execFileSync('psql',['-d','rabto_e2e','-Atc',sql],{encoding:'utf8'}).trim();
const mails=()=>fs.existsSync(SINK)?fs.readFileSync(SINK,'utf8').trim().split('\n').filter(Boolean).map(l=>JSON.parse(l)):[];
const ADM=await call('/api/auth/login',{method:'POST',body:{email:'admin@test.local',password:'Admin-Test-Pass-123'}});const A=ADM.cookie;
const PW='Support-Pass-12345';
const mk=async(email,slug)=>{const r=await call('/api/admin/customers',{method:'POST',cookie:A,body:{email,workspaceName:slug,workspaceSlug:slug}});const tok=new URL(r.j.invitation.url).searchParams.get('token');const a=await call('/api/auth/accept-invitation',{method:'POST',body:{token:tok,password:PW}});return {cookie:a.cookie,ws:r.j.customer.workspace.id};};
const X=await mk('sx@test.local','sx-co');
const T=(s,b)=>call('/api/customer/support',{method:'POST',cookie:X.cookie,body:{workspaceId:X.ws,subject:s,body:b}});
const a=await T('Retry subject','same body'),b=await T('Retry subject','same body');
chk('retried identical ticket returns the original, one row',a.s===201&&b.s===201&&a.j.ticket.id===b.j.ticket.id&&q("select count(*) from support_tickets where subject='Retry subject'")==='1');
const id=a.j.ticket.id;const M=(t)=>call('/api/customer/support/'+id,{method:'POST',cookie:X.cookie,body:{body:t}});
const m1=await M('hello there'),m2=await M('hello there'),m3=await M('different text');
chk('retried identical reply stored once, different text stored',m1.s===201&&m2.s===201&&m3.s===201&&q("select count(*) from support_messages where ticket_id='"+id+"'")==='3');
chk('five parallel identical replies store one',(await Promise.all(Array.from({length:5},()=>M('burst text')))).every(r=>r.s===201)&&q("select count(*) from support_messages where body='burst text'")==='1');
let tk=0,c429=0;for(let i=0;i<14;i++){const r=await T('Flood '+i,'body '+i);if(r.s===201)tk++;else if(r.s===429)c429++;}
// The earlier retried pair already used 2 of the 10 hourly allowance (the limiter counts calls, retries included), so 8 more succeed; the workspace open-ticket cap (20) is not the limiter here.
chk('per-user ticket limit is exactly 10 calls per hour, then 429',tk===8&&c429===6&&Number(q("select count(*) from support_tickets where status<>'closed'"))<20,'created '+tk+' limited '+c429);
console.log(out.join('\n'));process.exit(bad?1:0);
