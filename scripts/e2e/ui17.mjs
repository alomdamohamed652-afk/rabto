// Screenshots: customer FAQ panel (answer shown, no-match support actions) and the admin guide panel. Needs E2E_PROD=1.
import { createRequire } from "node:module"; const puppeteer=createRequire("/tmp/e2e/")("puppeteer-core");
const B=process.env.E2E_BASE_URL;const pre=process.env.SHOT_PREFIX||'faq';
async function call(path,{method='GET',body,cookie}={}){const r=await fetch(B+path,{method,headers:{...(body?{'content-type':'application/json'}:{}),...(cookie?{cookie}:{})},body:body?JSON.stringify(body):undefined});let j=null;try{j=await r.json()}catch{}return{s:r.status,j,cookie:(r.headers.get('set-cookie')||'').split(';')[0]}}
const A=(await call('/api/auth/login',{method:'POST',body:{email:'admin@test.local',password:'Admin-Test-Pass-123'}})).cookie;
const c=await call('/api/admin/customers',{method:'POST',cookie:A,body:{email:'ui17@gmail.com',workspaceName:'Demo Cafe',workspaceSlug:'demo-cafe'}});
const ck=(await call('/api/auth/accept-invitation',{method:'POST',body:{token:new URL(c.j.invitation.url).searchParams.get('token'),password:'Ui17-Test-Pass-1234'}})).cookie;
const sl=(ms)=>new Promise(r=>setTimeout(r,ms));
const br=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox'],headless:'new'});
for(const lang of ['ar','en']){
  const mk=async(cookie)=>{const pg=await br.newPage();const [n,...v]=cookie.split('=');await pg.setCookie({name:n,value:v.join('='),url:B},{name:'rabto_lang',value:lang,url:B});return pg;};
  const pg=await mk(ck);
  for(const [w,h,tag] of [[1440,900,'d'],[390,844,'m']]){
    await pg.setViewport({width:w,height:h,deviceScaleFactor:1.5});await pg.goto(B+'/app',{waitUntil:'networkidle0'});
    await (await pg.$$('.assistant-tabs button'))[2].click();await sl(300);await (await pg.$$('.assistant-chips button'))[1].click();await sl(800);
    const inp=await pg.$('.assistant-form input');await inp.type('zzz qqq');await pg.keyboard.press('Enter');await sl(900);
    await (await pg.$('#assistant')).screenshot({path:`/downloads/${pre}-${lang}-${tag}.png`});
    const info=await pg.evaluate(()=>({over:document.documentElement.scrollWidth>innerWidth,topics:document.querySelectorAll('.assistant-topic').length,btns:document.querySelectorAll('.assistant-actions a').length}));console.log(lang,tag,JSON.stringify(info));
  }
  await pg.close();
  const ap=await mk(A);
  for(const [w,h,tag] of [[1440,900,'d'],[390,844,'m']]){
    await ap.setViewport({width:w,height:h,deviceScaleFactor:1.5});await ap.goto(B+'/admin',{waitUntil:'networkidle0'});
    const b=await ap.$$('#guide-admin .guide-actions button');if(b[0]){await b[0].click();await sl(400);}
    await (await ap.$('#guide-admin')).screenshot({path:`/downloads/${pre}-admin-${lang}-${tag}.png`});
    console.log('admin',lang,tag,JSON.stringify(await ap.evaluate(()=>({over:document.documentElement.scrollWidth>innerWidth,panelW:document.querySelector('#guide-admin').getBoundingClientRect().width,enqW:document.querySelector('#enquiries')?.getBoundingClientRect().width,vw:innerWidth}))));
  }
  await ap.close();
}
await br.close();process.exit(0);
