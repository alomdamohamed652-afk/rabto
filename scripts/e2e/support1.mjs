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
const X=await mk('sx@test.local','sx-co'),Y=await mk('sy@test.local','sy-co');
const t=await call('/api/customer/support',{method:'POST',cookie:X.cookie,body:{workspaceId:X.ws,subject:'Tag not scanning',body:'It does nothing'}});chk('customer creates ticket',t.s===201&&t.j.ticket.status==='open',String(t.s));const id=t.j.ticket.id;
chk('create into another tenant workspace refused',(await call('/api/customer/support',{method:'POST',cookie:Y.cookie,body:{workspaceId:X.ws,subject:'Sneaky ticket',body:'x'}})).s===403);
chk('unauthenticated create refused',(await call('/api/customer/support',{method:'POST',body:{workspaceId:X.ws,subject:'No session',body:'x'}})).s===401);
chk('invalid subject/body rejected',(await call('/api/customer/support',{method:'POST',cookie:X.cookie,body:{workspaceId:X.ws,subject:'a',body:'x'}})).s===400&&(await call('/api/customer/support',{method:'POST',cookie:X.cookie,body:{workspaceId:X.ws,subject:'Long body',body:'x'.repeat(4001)}})).s===400);
chk('owner lists own ticket',(await call('/api/customer/support?workspaceId='+X.ws,{cookie:X.cookie})).j.tickets.length===1);
chk('other tenant sees none and cannot read thread',(await call('/api/customer/support?workspaceId='+Y.ws,{cookie:Y.cookie})).j.tickets.length===0&&(await call('/api/customer/support?workspaceId='+Y.ws+'&ticketId='+id,{cookie:Y.cookie})).s===404&&(await call('/api/customer/support?workspaceId='+X.ws,{cookie:Y.cookie})).s===403);
chk('other tenant cannot reply (404 like missing)',(await call('/api/customer/support/'+id,{method:'POST',cookie:Y.cookie,body:{body:'hi'}})).s===404&&(await call('/api/customer/support/00000000-0000-4000-8000-000000000000',{method:'POST',cookie:Y.cookie,body:{body:'hi'}})).s===404);
chk('customer cannot use admin support API',(await call('/api/admin/support',{cookie:X.cookie})).s===403&&(await call('/api/admin/support/'+id,{method:'POST',cookie:X.cookie,body:{body:'x'}})).s===403&&(await call('/api/admin/support/'+id,{method:'PATCH',cookie:X.cookie,body:{status:'closed'}})).s===403);
const al=await call('/api/admin/support',{cookie:A});chk('admin sees ticket with workspace name',al.s===200&&al.j.tickets.some(x=>x.id===id&&x.workspaceSlug==='sx-co'));
chk('admin reply -> pending',(await call('/api/admin/support/'+id,{method:'POST',cookie:A,body:{body:'Try again please'}})).s===201&&q("select status from support_tickets where id='"+id+"'")==='pending');
const th=await call('/api/customer/support?workspaceId='+X.ws+'&ticketId='+id,{cookie:X.cookie});chk('customer sees both messages in order, staff flagged',th.j.messages.length===2&&th.j.messages[1].fromStaff===true&&th.j.messages[0].fromStaff===false);
chk('admin closes',(await call('/api/admin/support/'+id,{method:'PATCH',cookie:A,body:{status:'closed'}})).s===200&&q("select status from support_tickets where id='"+id+"'")==='closed');
chk('invalid status rejected',(await call('/api/admin/support/'+id,{method:'PATCH',cookie:A,body:{status:'weird'}})).s===400);
chk('customer reply reopens closed ticket',(await call('/api/customer/support/'+id,{method:'POST',cookie:X.cookie,body:{body:'Still broken'}})).s===201&&q("select status from support_tickets where id='"+id+"'")==='open');
chk('admin status filter',(await call('/api/admin/support?status=open',{cookie:A})).j.tickets.length===1&&(await call('/api/admin/support?status=closed',{cookie:A})).j.tickets.length===0);
chk('audit rows read back',q("select count(*) from audit_logs where action='support.ticket_created'")==='1'&&q("select count(*) from audit_logs where action='support.staff_replied'")==='1'&&q("select count(*) from audit_logs where action='support.customer_replied'")==='1'&&q("select details->>'to' from audit_logs where action='support.status_changed' order by created_at desc limit 1")==='closed');
// limits under concurrency: 20 open tickets per workspace
const res=await Promise.all(Array.from({length:30},(_,i)=>call('/api/customer/support',{method:'POST',cookie:Y.cookie,body:{workspaceId:Y.ws,subject:'Parallel '+i,body:'b'}})));
chk('parallel creates stop at the open-ticket limit',res.filter(r=>r.s===201).length===20&&res.filter(r=>r.s===429).length===10&&q("select count(*) from support_tickets where workspace_id='"+Y.ws+"'")==='20',res.map(r=>r.s).join(',').slice(0,60));
// admin phone edit
const ph=await call('/api/admin/users/phone',{method:'PUT',cookie:A,body:{email:'sx@test.local',phone:'01055550001'}});chk('admin sets phone on existing account',ph.s===200&&q("select phone from users where email='sx@test.local'")==='+201055550001');
chk('collision refused',(await call('/api/admin/users/phone',{method:'PUT',cookie:A,body:{email:'sy@test.local',phone:'+20 105 555 0001'}})).s===409);
chk('phone login works for old account',(await call('/api/auth/login',{method:'POST',body:{email:'01055550001',password:PW},ip:'10.7.0.1'})).s===200);
chk('customer cannot edit phones',(await call('/api/admin/users/phone',{method:'PUT',cookie:X.cookie,body:{email:'sy@test.local',phone:'01055550002'}})).s===403);
chk('clear phone',(await call('/api/admin/users/phone',{method:'PUT',cookie:A,body:{email:'sx@test.local',phone:null}})).s===200&&q("select phone is null from users where email='sx@test.local'")==='t');
chk('phone audit holds only last digits',q("select count(*) from audit_logs where action='user.phone_changed'")==='2'&&q("select count(*) from audit_logs where details::text like '%0555500%' or details::text like '%1055550%'")==='0');
console.log(out.join('\n'));process.exit(bad?1:0);
