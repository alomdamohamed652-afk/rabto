// Public /plans page: empty state and populated state (demo plans), mobile.
import { createRequire } from "node:module"; const puppeteer=createRequire("/tmp/e2e/")("puppeteer-core");
const B=process.env.E2E_BASE_URL;
async function call(path,{method='GET',body,cookie}={}){const r=await fetch(B+path,{method,headers:{...(body?{'content-type':'application/json'}:{}),...(cookie?{cookie}:{})},body:body?JSON.stringify(body):undefined});let j=null;try{j=await r.json()}catch{}return{s:r.status,j,cookie:(r.headers.get('set-cookie')||'').split(';')[0]}}
const br=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox'],headless:'new'});
const pg=await br.newPage();
const vp=async(w,h,name)=>{await pg.setViewport({width:w,height:h,deviceScaleFactor:1.5});await pg.setCacheEnabled(false);await pg.goto(B+'/plans',{waitUntil:'networkidle0'});await pg.screenshot({path:'/downloads/'+name,fullPage:true});return pg.evaluate(()=>({over:document.documentElement.scrollWidth>innerWidth,minfs:Math.min(...[...document.querySelectorAll('.pl-wrap *')].filter(e=>e.childNodes.length&&[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())).map(e=>parseFloat(getComputedStyle(e).fontSize)))}));};
console.log('empty text ok',(await pg.evaluate(()=>document.body.innerText)).includes('الباقات لسه متنشرتش'));
const e=await vp(390,844,'plans2-empty-m.png');console.log('empty mobile',JSON.stringify(e));
const A=(await call('/api/auth/login',{method:'POST',body:{email:'admin@test.local',password:'Admin-Test-Pass-123'}})).cookie;
await call('/api/admin/plans',{method:'POST',cookie:A,body:{name:'Demo Starter',description:'Demo plan record for layout check',priceNote:'Demo price note',maxActivatedProducts:10,maxPages:3,analyticsEnabled:false}});
await call('/api/admin/plans',{method:'POST',cookie:A,body:{name:'Demo Growth',description:'Second demo record',maxActivatedProducts:100,maxPages:20,analyticsEnabled:true}});
await call('/api/admin/plans',{method:'POST',cookie:A,body:{name:'Demo Open',description:'No limits set',analyticsEnabled:true}});
const m=await vp(390,844,'plans2-m.png');console.log('populated mobile',JSON.stringify(m));
const d=await vp(1440,900,'plans2-d.png');console.log('populated desktop',JSON.stringify(d));
const t=await vp(768,1024,'plans2-t.png');console.log('tablet',JSON.stringify(t));
await pg.evaluate(()=>{});await pg.goto(B+'/plans',{waitUntil:'networkidle0'});
console.log('dir',await pg.evaluate(()=>document.querySelector('main').dir),'infinity shown',(await pg.evaluate(()=>document.body.innerText)).includes('∞'));
await br.close();
