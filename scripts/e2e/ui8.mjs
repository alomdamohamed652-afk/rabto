// Forgot-password phone-first flow screenshots (demo data, no real codes).
import { createRequire } from "node:module"; const puppeteer=createRequire("/tmp/e2e/")("puppeteer-core");
const B=process.env.E2E_BASE_URL;
async function call(path,{method='GET',body,cookie}={}){const r=await fetch(B+path,{method,headers:{...(body?{'content-type':'application/json'}:{}),...(cookie?{cookie}:{})},body:body?JSON.stringify(body):undefined});const sc=r.headers.get('set-cookie');return {s:r.status,j:await r.json().catch(()=>({})),cookie:sc?sc.split(';')[0]:null};}
const A=(await call('/api/auth/login',{method:'POST',body:{email:'admin@test.local',password:'Admin-Test-Pass-123'}})).cookie;
const c=await call('/api/admin/customers',{method:'POST',cookie:A,body:{email:'ahmed@gmail.com',workspaceName:'Ahmed co',workspaceSlug:'ahmed-co',phone:'01022223333'}});
await call('/api/auth/accept-invitation',{method:'POST',body:{token:new URL(c.j.invitation.url).searchParams.get('token'),password:'Demo-Pass-123456'}});
const br=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox'],headless:'new'});
const pg=await br.newPage();await pg.setViewport({width:390,height:844,deviceScaleFactor:2});
await pg.goto(B+'/forgot-password',{waitUntil:'networkidle0'});
await pg.click('button.admin-secondary');await new Promise(r=>setTimeout(r,500));
await pg.type('input[type=tel]','01022223333');await pg.screenshot({path:'/downloads/reset-phone-step1.png'});
await pg.click('button.admin-primary');await new Promise(r=>setTimeout(r,1200));
const txt=await pg.evaluate(()=>document.body.innerText);console.log('masked shown',txt.includes('a***@g***.com'),'overflow',await pg.evaluate(()=>document.documentElement.scrollWidth>innerWidth));
await pg.screenshot({path:'/downloads/reset-phone-step2.png'});await br.close();
