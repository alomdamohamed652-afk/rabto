// Screenshots of support panels, login and admin customer form (phones). Demo data only, no activation secrets.
import { createRequire } from "node:module"; const puppeteer=createRequire("/tmp/e2e/")("puppeteer-core");
const B=process.env.E2E_BASE_URL;
async function call(path,{method='GET',body,cookie}={}){const r=await fetch(B+path,{method,headers:{...(body?{'content-type':'application/json'}:{}),...(cookie?{cookie}:{})},body:body?JSON.stringify(body):undefined});const sc=r.headers.get('set-cookie');return {s:r.status,j:await r.json().catch(()=>({})),cookie:sc?sc.split(';')[0]:null};}
const A=(await call('/api/auth/login',{method:'POST',body:{email:'admin@test.local',password:'Admin-Test-Pass-123'}})).cookie;
const c=await call('/api/admin/customers',{method:'POST',cookie:A,body:{email:'demo@test.local',workspaceName:'Demo Cafe',workspaceSlug:'demo-cafe',phone:'01012345678'}});
const a=await call('/api/auth/accept-invitation',{method:'POST',body:{token:new URL(c.j.invitation.url).searchParams.get('token'),password:'Demo-Pass-123456'}});
const t=await call('/api/customer/support',{method:'POST',cookie:a.cookie,body:{workspaceId:c.j.customer.workspace.id,subject:'الكود مش بيفتح',body:'جربت اسكان الكود ومفيش حاجة بتحصل'}});
await call('/api/admin/support/'+t.j.ticket.id,{method:'POST',cookie:A,body:{body:'ممكن تبعتلي رقم المنتج؟'}});
const br=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox'],headless:'new'});
async function shot(cookie,url,out,sel,open){const pg=await br.newPage();await pg.setViewport({width:390,height:844,deviceScaleFactor:2});if(cookie)await pg.setCookie({name:'rabto_session',value:cookie.split('=')[1],url:B});await pg.goto(B+url,{waitUntil:'networkidle0'});await new Promise(r=>setTimeout(r,800));
 if(open){const b=await pg.$('#support .support-row');if(b)await b.click();await new Promise(r=>setTimeout(r,800));}
 const el=sel?await pg.$(sel):null;await (el||pg).screenshot({path:out});console.log(out,'overflow',await pg.evaluate(()=>document.documentElement.scrollWidth>innerWidth));await pg.close();}
await shot(a.cookie,'/app','/downloads/support-customer-list-phone.png','#support',false);
await shot(a.cookie,'/app','/downloads/support-customer-thread-phone.png','#support',true);
await shot(A,'/admin','/downloads/support-admin-phone.png','#support',false);
await shot(null,'/login','/downloads/login-phone-field.png','.auth-card',false);
await shot(A,'/admin','/downloads/admin-customer-form-phone.png','#customers .admin-panel',false);
await br.close();
