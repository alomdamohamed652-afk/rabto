// Public /plans page: empty state and populated state (demo plans), mobile.
import { createRequire } from "node:module"; const puppeteer=createRequire("/tmp/e2e/")("puppeteer-core");
const B=process.env.E2E_BASE_URL;
async function call(path,{method='GET',body,cookie}={}){const r=await fetch(B+path,{method,headers:{...(body?{'content-type':'application/json'}:{}),...(cookie?{cookie}:{})},body:body?JSON.stringify(body):undefined});let j=null;try{j=await r.json()}catch{}return{s:r.status,j,cookie:(r.headers.get('set-cookie')||'').split(';')[0]}}
const br=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox'],headless:'new'});
const pg=await br.newPage();await pg.setViewport({width:390,height:844,deviceScaleFactor:2});
await pg.goto(B+'/plans',{waitUntil:'networkidle0'});await pg.screenshot({path:'/downloads/plans-empty.png',fullPage:true});
console.log('empty text',(await pg.evaluate(()=>document.body.innerText)).includes('لسه مفيش باقات'));
const A=(await call('/api/auth/login',{method:'POST',body:{email:'admin@test.local',password:'Admin-Test-Pass-123'}})).cookie;
await call('/api/admin/plans',{method:'POST',cookie:A,body:{name:'Demo Starter',description:'Demo plan record for layout check',maxActivatedProducts:10,maxPages:3}});
await call('/api/admin/plans',{method:'POST',cookie:A,body:{name:'Demo Open',description:'No limits set'}});
await pg.setCacheEnabled(false);await pg.goto(B+'/plans',{waitUntil:'networkidle0'});await pg.screenshot({path:'/downloads/plans-populated.png',fullPage:true});
console.log('overflow',await pg.evaluate(()=>document.documentElement.scrollWidth>innerWidth));await br.close();
