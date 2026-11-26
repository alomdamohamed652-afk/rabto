// Recovery help request (public form) and admin queue screenshots. Demo data only.
import { createRequire } from "node:module"; const puppeteer=createRequire("/tmp/e2e/")("puppeteer-core");
const B=process.env.E2E_BASE_URL;
async function call(path,{method='GET',body,cookie}={}){const r=await fetch(B+path,{method,headers:{...(body?{'content-type':'application/json'}:{}),...(cookie?{cookie}:{})},body:body?JSON.stringify(body):undefined});let j=null;try{j=await r.json()}catch{}return{s:r.status,j,cookie:(r.headers.get('set-cookie')||'').split(';')[0]}}
const A=(await call('/api/auth/login',{method:'POST',body:{email:'admin@test.local',password:'Admin-Test-Pass-123'}})).cookie;
await call('/api/admin/customers',{method:'POST',cookie:A,body:{email:'demo@gmail.com',workspaceName:'Demo co',workspaceSlug:'demo-co',phone:'01022223333'}});
const br=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox'],headless:'new'});
const pg=await br.newPage();await pg.setViewport({width:390,height:844,deviceScaleFactor:2});
await pg.goto(B+'/forgot-password',{waitUntil:'networkidle0'});
const btn=await pg.$$('button.admin-secondary');for(const b of btn){const t=await b.evaluate(e=>e.textContent);if(/مساعدة|help/i.test(t)){await b.click();break;}}
await new Promise(r=>setTimeout(r,400));
await pg.type('input[type=tel]','01022223333');await pg.type('input:not([type=tel])','نسيت الإيميل القديم');await pg.screenshot({path:'/downloads/recovery-help-form.png'});
await pg.click('button.admin-primary');await new Promise(r=>setTimeout(r,1200));
console.log('done message shown',(await pg.evaluate(()=>document.body.innerText)).includes('الفريق'),'overflow',await pg.evaluate(()=>document.documentElement.scrollWidth>innerWidth));
await pg.screenshot({path:'/downloads/recovery-help-sent.png'});
const ap=await br.newPage();await ap.setViewport({width:1280,height:900});
await ap.setCookie({name:A.split('=')[0],value:A.split('=').slice(1).join('='),url:B});
await ap.goto(B+'/admin',{waitUntil:'networkidle0'});await new Promise(r=>setTimeout(r,800));
const el=await ap.$('#recovery');console.log('admin panel present',!!el);if(el){await el.screenshot({path:'/downloads/recovery-admin-queue.png'});}
await br.close();
