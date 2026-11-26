// Screenshots of the admin plans panel and the customer plan panel (TEST ONLY, fake data).
import { createRequire } from "node:module"; const puppeteer=createRequire("/tmp/e2e/")("puppeteer-core");
const B=process.env.E2E_BASE_URL||'http://127.0.0.1:3111';
async function call(path,{method='GET',body,cookie}={}){const r=await fetch(B+path,{method,headers:{...(body?{'content-type':'application/json'}:{}),...(cookie?{cookie}:{})},body:body?JSON.stringify(body):undefined});let j=null;try{j=await r.json()}catch{};const sc=r.headers.get('set-cookie');return {s:r.status,j,cookie:sc?sc.split(';')[0]:null};}
let r=await call('/api/auth/login',{method:'POST',body:{email:'admin@test.local',password:'Admin-Test-Pass-123'}});const A=r.cookie;
r=await call('/api/admin/plans',{method:'POST',cookie:A,body:{name:'Starter (demo)',description:'Demo plan for screenshots',maxActivatedProducts:5,maxPages:2,analyticsEnabled:false}});const p1=r.j.id;
await call('/api/admin/plans',{method:'POST',cookie:A,body:{name:'Full (demo)',description:'Demo plan, no limits'}});
r=await call('/api/admin/customers',{method:'POST',cookie:A,body:{email:'demo@test.local',workspaceName:'Demo Cafe',workspaceSlug:'demo-cafe',planId:p1}});
const tok=new URL(r.j.invitation.url).searchParams.get('token');const acc=await call('/api/auth/accept-invitation',{method:'POST',body:{token:tok,password:'Customer-Pass-demo-1234'}});
const br=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox'],headless:'new'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
for (const [name,cookie,url,sel,file] of [['admin',A,'/admin','#plans','/downloads/plans-admin-phone.png'],['customer',acc.cookie,'/app','#plan','/downloads/plans-customer-phone.png']]) {
  const pg=await br.newPage();await pg.setViewport({width:390,height:844,deviceScaleFactor:2});
  const [n,v]=cookie.split('=');await pg.setCookie({name:n,value:v,url:B});
  await pg.goto(B+url,{waitUntil:'networkidle0'});await sleep(800);
  const el=await pg.$(sel);await el.screenshot({path:file});
  console.log(name,'overflow',await pg.evaluate(()=>document.documentElement.scrollWidth>innerWidth));
}
await br.close();
