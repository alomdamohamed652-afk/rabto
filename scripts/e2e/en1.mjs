// Public enquiry: stored only, abuse-protected, admin-only review.
import fs from 'node:fs'; import { execFileSync } from 'node:child_process';
const B=process.env.E2E_BASE_URL; const SINK=process.env.E2E_MAIL_SINK; const out=[]; let bad=0;
const chk=(k,ok,x='')=>{out.push((ok?'PASS ':'FAIL ')+k+(x?' '+x:''));if(!ok)bad++;};
async function call(path,{method='GET',body,cookie,ip}={}){const r=await fetch(B+path,{method,headers:{...(body?{'content-type':'application/json'}:{}),...(cookie?{cookie}:{}),...(ip?{'x-forwarded-for':ip}:{})},body:body?JSON.stringify(body):undefined});let j=null;try{j=await r.json()}catch{};const sc=r.headers.get('set-cookie');return {s:r.status,j,cookie:sc?sc.split(';')[0]:null};}
const q=(sql)=>execFileSync('psql',['-d','rabto_e2e','-Atc',sql],{encoding:'utf8'}).trim();
const A=(await call('/api/auth/login',{method:'POST',body:{email:'admin@test.local',password:'Admin-Test-Pass-123'}})).cookie;
const E=(b,ip)=>call('/api/public/enquiry',{method:'POST',body:b,ip});
chk('valid enquiry by email stored',(await E({name:'Sara',contact:'Sara@Example.com',message:'How do plans work?'},'10.12.0.1')).s===200&&q("select contact from enquiries")==='sara@example.com');
chk('valid enquiry by phone stored in canonical form',(await E({name:'Omar',contact:'01012345678',message:'Hi'},'10.12.0.2')).s===200&&q("select count(*) from enquiries where contact='+201012345678'")==='1');
chk('invalid contact, empty message, long message rejected',(await E({name:'x',contact:'nope',message:'m'})).s===400&&(await E({name:'x',contact:'a@b.co',message:''})).s===400&&(await E({name:'x',contact:'a@b.co',message:'m'.repeat(2001)})).s===400&&q("select count(*) from enquiries")==='2');
chk('nothing is mailed',!fs.existsSync(SINK)||fs.readFileSync(SINK,'utf8').trim()==='');
chk('queue needs admin',(await call('/api/admin/enquiries')).s===401&&(await call('/api/admin/enquiries',{method:'PUT',body:{id:'x'}})).s===401);
const l=await call('/api/admin/enquiries?status=new',{cookie:A});
chk('admin sees both new enquiries',l.s===200&&l.j.enquiries.length===2);
const id=l.j.enquiries[0].id;
chk('mark handled with audit row, removed from new list',(await call('/api/admin/enquiries',{method:'PUT',cookie:A,body:{id}})).s===200&&(await call('/api/admin/enquiries?status=new',{cookie:A})).j.enquiries.length===1&&q("select count(*) from audit_logs where action in ('enquiry.created','enquiry.handled')")==='3');
chk('bad id 400, unknown id 404',(await call('/api/admin/enquiries',{method:'PUT',cookie:A,body:{id:'zzz'}})).s===400&&(await call('/api/admin/enquiries',{method:'PUT',cookie:A,body:{id:'00000000-0000-0000-0000-000000000000'}})).s===404);
let n=0;for(let i=0;i<5;i++){if((await E({name:'Spam',contact:'spam@x.com',message:'buy'},'10.12.1.'+i)).s===429)n++;}
chk('per-contact limit (3/hour) returns 429',n>=2,'429s '+n);
console.log(out.join('\n'));process.exit(bad?1:0);
