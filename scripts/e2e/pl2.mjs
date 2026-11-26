// Public plans: only active plans, only display fields, honest empty state.
import fs from 'node:fs'; import { execFileSync } from 'node:child_process';
const B=process.env.E2E_BASE_URL; const SINK=process.env.E2E_MAIL_SINK; const out=[]; let bad=0;
const chk=(k,ok,x='')=>{out.push((ok?'PASS ':'FAIL ')+k+(x?' '+x:''));if(!ok)bad++;};
async function call(path,{method='GET',body,cookie,ip}={}){const r=await fetch(B+path,{method,headers:{...(body?{'content-type':'application/json'}:{}),...(cookie?{cookie}:{}),...(ip?{'x-forwarded-for':ip}:{})},body:body?JSON.stringify(body):undefined});let j=null;try{j=await r.json()}catch{};const sc=r.headers.get('set-cookie');return {s:r.status,j,cookie:sc?sc.split(';')[0]:null};}
const q=(sql)=>execFileSync('psql',['-d','rabto_e2e','-Atc',sql],{encoding:'utf8'}).trim();
const A=(await call('/api/auth/login',{method:'POST',body:{email:'admin@test.local',password:'Admin-Test-Pass-123'}})).cookie;
const e=await call('/api/public/plans');
chk('public plans: anonymous access, empty list when none',e.s===200&&Array.isArray(e.j.plans)&&e.j.plans.length===0);
const p1=await call('/api/admin/plans',{method:'POST',cookie:A,body:{name:'Starter',description:'Demo plan',priceNote:'Price set by the team',maxActivatedProducts:10,maxPages:3,includedCredits:5}});
const p2=await call('/api/admin/plans',{method:'POST',cookie:A,body:{name:'Hidden',description:'x',includedCredits:1,isActive:false}});
const l=await call('/api/public/plans');
chk('public list shows active plan with limits',l.s===200&&l.j.plans.some(p=>p.name==='Starter'&&p.maxActivatedProducts===10&&p.maxPages===3&&p.priceNote==='Price set by the team'));
chk('inactive plan is not public',!l.j.plans.some(p=>p.name==='Hidden'),JSON.stringify(l.j.plans.map(p=>p.name)));
const keys=new Set(l.j.plans.flatMap(p=>Object.keys(p)));
chk('no ids or credits exposed',!keys.has('id')&&!keys.has('includedCredits'),[...keys].join(','));
console.log(out.join('\n'));process.exit(bad?1:0);
