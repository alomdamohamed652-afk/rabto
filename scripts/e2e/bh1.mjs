// Batch history and reprint: public codes only, never activation secrets, admin only.
import fs from 'node:fs'; import { execFileSync } from 'node:child_process';
const B=process.env.E2E_BASE_URL; const SINK=process.env.E2E_MAIL_SINK; const out=[]; let bad=0;
const chk=(k,ok,x='')=>{out.push((ok?'PASS ':'FAIL ')+k+(x?' '+x:''));if(!ok)bad++;};
async function call(path,{method='GET',body,cookie,ip}={}){const r=await fetch(B+path,{method,headers:{...(body?{'content-type':'application/json'}:{}),...(cookie?{cookie}:{}),...(ip?{'x-forwarded-for':ip}:{})},body:body?JSON.stringify(body):undefined});let j=null;try{j=await r.json()}catch{};const sc=r.headers.get('set-cookie');return {s:r.status,j,cookie:sc?sc.split(';')[0]:null};}
const q=(sql)=>execFileSync('psql',['-d','rabto_e2e','-Atc',sql],{encoding:'utf8'}).trim();
const A=(await call('/api/auth/login',{method:'POST',body:{email:'admin@test.local',password:'Admin-Test-Pass-123'}})).cookie;
const c=await call('/api/admin/customers',{method:'POST',cookie:A,body:{email:'bh@gmail.com',workspaceName:'Bh co',workspaceSlug:'bh-co'}});
const ws=c.j.customer.workspace.id;
await call('/api/auth/accept-invitation',{method:'POST',body:{token:new URL(c.j.invitation.url).searchParams.get('token'),password:'Batch-Hist-Pass-1234'}});
const cust=(await call('/api/auth/login',{method:'POST',body:{email:'bh@gmail.com',password:'Batch-Hist-Pass-1234'},ip:'10.11.0.1'})).cookie;
const pt=(await call('/api/admin/product-types',{method:'POST',cookie:A,body:{workspaceId:ws,name:'Card',skuPrefix:'CRD'}})).j.productType.id;
const b=await call('/api/admin/batches',{method:'POST',cookie:A,body:{workspaceId:ws,productTypeId:pt,batchCode:'H1',quantity:3,initialDestinationUrl:'https://example.com/h'}});
const issued=b.j.codes||b.j.issuedCodes||[];
chk('batch created with secrets shown once at creation',b.s===201&&issued.length===6&&issued.every(x=>x.activationSecret));
chk('history needs admin: anonymous 401, customer 403',(await call('/api/admin/batches')).s===401&&(await call('/api/admin/batches',{cookie:cust})).s===403);
const l=await call('/api/admin/batches',{cookie:A});
chk('history lists the batch with counts',l.s===200&&l.j.batches.length===1&&l.j.batches[0].code==='H1'&&l.j.batches[0].quantity===3&&l.j.batches[0].activated===0&&l.j.batches[0].workspaceName==='Bh co');
chk('workspace filter works, bad id 400',(await call('/api/admin/batches?workspaceId='+ws,{cookie:A})).j.batches.length===1&&(await call('/api/admin/batches?workspaceId=nope',{cookie:A})).s===400);
const id=l.j.batches[0].id;
const rc=await call('/api/admin/batches/'+id+'/codes',{cookie:A});
chk('reprint returns all 6 public codes matching creation',rc.s===200&&rc.j.codes.length===6&&issued.every(x=>rc.j.codes.some(y=>y.publicCode===x.publicCode&&y.channel===x.channel)));
const txt=JSON.stringify(rc.j);
chk('reprint never contains activation secrets',!issued.some(x=>txt.includes(x.activationSecret))&&!/activation|secret|hash/i.test(Object.keys(rc.j.codes[0]).join(',')));
chk('reprint needs admin, unknown or bad batch rejected',(await call('/api/admin/batches/'+id+'/codes')).s===401&&(await call('/api/admin/batches/'+id+'/codes',{cookie:cust})).s===403&&(await call('/api/admin/batches/00000000-0000-0000-0000-000000000000/codes',{cookie:A})).s===404&&(await call('/api/admin/batches/zzz/codes',{cookie:A})).s===400);
console.log(out.join('\n'));process.exit(bad?1:0);
