// Customer dashboard with the built-in help guide: asks two questions via the chips, screenshots desktop and mobile. Needs E2E_PROD=1.
import { createRequire } from "node:module"; const puppeteer=createRequire("/tmp/e2e/")("puppeteer-core");
const B=process.env.E2E_BASE_URL;
async function call(path,{method='GET',body,cookie}={}){const r=await fetch(B+path,{method,headers:{...(body?{'content-type':'application/json'}:{}),...(cookie?{cookie}:{})},body:body?JSON.stringify(body):undefined});let j=null;try{j=await r.json()}catch{}return{s:r.status,j,cookie:(r.headers.get('set-cookie')||'').split(';')[0]}}
const A=(await call('/api/auth/login',{method:'POST',body:{email:'admin@test.local',password:'Admin-Test-Pass-123'}})).cookie;
const c=await call('/api/admin/customers',{method:'POST',cookie:A,body:{email:'ui15@gmail.com',workspaceName:'Demo Cafe',workspaceSlug:'demo-cafe'}});
await call('/api/auth/accept-invitation',{method:'POST',body:{token:new URL(c.j.invitation.url).searchParams.get('token'),password:'Ui15-Test-Pass-1234'}});
const ck=(await call('/api/auth/login',{method:'POST',body:{email:'ui15@gmail.com',password:'Ui15-Test-Pass-1234'}})).cookie;
const [name,...v]=ck.split('=');
const br=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox'],headless:'new'});
for(const lang of ['ar','en']){
  const pg=await br.newPage();await pg.setCookie({name,value:v.join('='),url:B},{name:'rabto_lang',value:lang,url:B});
  for(const [w,h,tag] of [[1440,900,'d'],[390,844,'m']]){
    await pg.setViewport({width:w,height:h,deviceScaleFactor:1.5});await pg.goto(B+'/app',{waitUntil:'networkidle0'});
    const chips=await pg.$$('.assistant-chips button');await chips[0].click();await new Promise(r=>setTimeout(r,1200));(await pg.$$('.assistant-chips button'))[3].click();await new Promise(r=>setTimeout(r,1200));
    const el=await pg.$('#assistant');await el.screenshot({path:`/downloads/asst-${lang}-${tag}.png`});
    const info=await pg.evaluate(()=>({turns:document.querySelectorAll('.assistant-turn').length,over:document.documentElement.scrollWidth>innerWidth,minfs:Math.min(...[...document.querySelectorAll('#assistant *')].filter(e=>e.childNodes.length&&[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())).map(e=>parseFloat(getComputedStyle(e).fontSize)))}));
    console.log(lang,tag,JSON.stringify(info));
  }
  await pg.close();
}
await br.close();process.exit(0);
