// Fluid typography check: computed sizes across viewports, overflow, root font-size scaling, screenshots.
import { createRequire } from "node:module"; const puppeteer=createRequire("/tmp/e2e/")("puppeteer-core");
const B=process.env.E2E_BASE_URL;
const br=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox'],headless:'new'});
const pg=await br.newPage();
const probe=()=>pg.evaluate(()=>{const f=e=>parseFloat(getComputedStyle(e).fontSize);const els=[...document.querySelectorAll('body *')].filter(e=>e.childNodes.length&&[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())&&e.offsetParent!==null);const h=document.querySelector('h1');return{dir:document.documentElement.dir,h1:h?f(h):null,min:Math.min(...els.map(f)),overflow:document.documentElement.scrollWidth>innerWidth}});
const rows=[];
for(const w of [360,390,768,1024,1440]){await pg.setViewport({width:w,height:900,deviceScaleFactor:1});
 for(const path of ['/','/login','/forgot-password']){await pg.goto(B+path,{waitUntil:'networkidle0'});const r=await probe();rows.push({w,path,...r});}}
for(const r of rows)console.log(`w=${r.w} ${r.path} dir=${r.dir} h1=${r.h1} minText=${r.min} overflow=${r.overflow}`);
const bad=rows.filter(r=>r.overflow||r.min<12);console.log(bad.length?'FAIL overflow or text under 12px: '+JSON.stringify(bad):'PASS no overflow, no text under 12px');
// user font-size / zoom: root 20px must enlarge text
await pg.setViewport({width:390,height:844,deviceScaleFactor:2});await pg.goto(B+'/login',{waitUntil:'networkidle0'});
const a=await probe();await pg.evaluate(()=>{document.documentElement.style.fontSize='20px'});const b=await probe();
console.log(b.h1>a.h1&&b.min>a.min?`PASS root font-size 16->20px scales text (h1 ${a.h1}->${b.h1}, min ${a.min}->${b.min})`:`FAIL root scaling ${JSON.stringify([a,b])}`,'overflow at 125%:',b.overflow);
await pg.evaluate(()=>{document.documentElement.style.fontSize=''});
for(const [w,n] of [[390,'m'],[1440,'d']]){await pg.setViewport({width:w,height:900,deviceScaleFactor:1});await pg.goto(B+'/',{waitUntil:'networkidle0'});await pg.screenshot({path:`/downloads/fluid-landing-${n}.png`});}
await br.close();
