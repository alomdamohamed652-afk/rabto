import { execFileSync } from "node:child_process"; import { createRequire } from "node:module"; const puppeteer=createRequire("/tmp/e2e/")("puppeteer-core");
const B=process.env.E2E_BASE_URL||'http://127.0.0.1:3111'; const out=[]; const log=(k,v)=>out.push(k+': '+v);
async function call(path,{method='GET',body,cookie,raw}={}){const r=await fetch(B+path,{method,headers:{...(body?{'content-type':'application/json'}:{}),...(cookie?{cookie}:{})},body:body?JSON.stringify(body):undefined});let j=null,t=null;if(raw)t=await r.text();else{try{j=await r.json()}catch{}};const sc=r.headers.get('set-cookie');return {s:r.status,j,t,h:r.headers,cookie:sc?sc.split(';')[0]:null};}
const psql=(sql)=>{try{return {ok:true,out:execFileSync('psql',['-At','rabto_e2e','-c',sql],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim()}}catch(e){return {ok:false,out:String(e.stderr||e.message).trim().split('\n')[0]}}};
let r=await call('/api/auth/login',{method:'POST',body:{email:'admin@test.local',password:'Admin-Test-Pass-123'}});const A=r.cookie;
const c=[];for(const n of ['a','b']){r=await call('/api/admin/customers',{method:'POST',cookie:A,body:{email:`ed-${n}@test.local`,workspaceName:'ED '+n,workspaceSlug:'ed-'+n}});const tok=new URL(r.j.invitation.url).searchParams.get('token');const acc=await call('/api/auth/accept-invitation',{method:'POST',body:{token:tok,password:'Customer-Pass-'+n+'-1234'}});c.push({cookie:acc.cookie,ws:r.j.customer.workspace.id});}
const br=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox'],headless:'new'});
const pg=await br.newPage();await pg.setViewport({width:390,height:844,deviceScaleFactor:2});
const [nm,val]=c[0].cookie.split('=');await pg.setCookie({name:nm,value:val,url:B});
const errs=[];pg.on('pageerror',e=>errs.push(e.message));pg.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
await pg.goto(B+'/app',{waitUntil:'networkidle0'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const clickText=async(txt)=>{const ok=await pg.evaluate((t)=>{const b=[...document.querySelectorAll('.menu-editor button')].find(x=>x.textContent.trim()===t);if(b){b.scrollIntoView({block:'center'});b.click();return true}return false},txt);if(!ok)throw new Error('no button '+txt);await sleep(500)};
await clickText('منيو جديد');
const ins=async()=>pg.$$('.menu-form input:not([type=checkbox]),.menu-form textarea');
let f=await ins();await f[0].type('منيو الكافيه');await f[1].type('cafe');
await f[3].type('مشروبات ساخنة');await f[4].type('قهوة تركي');await f[5].type('60');
await pg.focus('.menu-form textarea');await pg.keyboard.type('بن محمّص طازج يُقدَّم مع ماء بارد وقطعة حلوى صغيرة على الجانب');
await pg.focus('.menu-form input[type=url]');await pg.keyboard.type('https://img.example.com/turkish.jpg');
await clickText('تم');
await clickText('إضافة صنف');
f=await ins();
// natural: focus each field of the open (second) item and check it is clear of the sticky bar
const clear=[];
const sel=['.item-block.open input:not([type=checkbox]):not([type=url])','.item-block.open input[inputmode=decimal]','.item-block.open textarea','.item-block.open input[type=url]'];
for(const s of sel){await pg.focus(s);await sleep(700);clear.push(s.split(' ').pop()+':'+await pg.evaluate((s)=>{const e=document.querySelector(s);const r=e.getBoundingClientRect();const bar=document.querySelector('.sticky').getBoundingClientRect();return Math.round(bar.top-r.bottom)+'px above bar, top '+Math.round(r.top)},s));
 if(s.includes('url'))await pg.screenshot({path:'/downloads/ed-focus-url-phone.png'});}
log('focus clearance',clear.join(' | '));
await pg.keyboard.type('https://img.example.com/x.jpg');
await pg.focus('.item-block.open input:not([type=checkbox]):not([type=url])');await pg.keyboard.type('نسكافيه بالحليب والكراميل المحمّص');
await pg.focus('.item-block.open input[inputmode=decimal]');await pg.keyboard.type('85,5');
await pg.focus('.item-block.open textarea');await pg.keyboard.type('كوب كبير');
await clickText('تم');
await pg.evaluate(()=>document.querySelector('#menus').scrollIntoView());await sleep(500);
await pg.screenshot({path:'/downloads/ed-collapsed-phone.png',fullPage:false});
await clickText('معاينة المنيو');
const h=await pg.evaluate(()=>document.querySelector('#menus').getBoundingClientRect().height);
await pg.setViewport({width:390,height:Math.min(3000,Math.ceil(h)+80),deviceScaleFactor:2});await sleep(400);
await pg.evaluate(()=>document.querySelector('#menus').scrollIntoView());await sleep(400);
await pg.screenshot({path:'/downloads/ed-full-phone.png'});
await clickText('نشر');await sleep(1500);
log('publish',await pg.$eval('.menu-msg',e=>e.textContent).catch(()=>'none'));
const pub=await call('/p/ed-a/cafe',{raw:true});log('public has both items and desc',String((pub.t||'').includes('قهوة تركي')&&(pub.t||'').includes('كوب كبير')&&(pub.t||'').includes('background-image')));
log('wide elements',await pg.evaluate(()=>[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>window.innerWidth+1).slice(0,12).map(e=>e.tagName+'.'+String(e.className).slice(0,30)+' '+Math.round(e.getBoundingClientRect().right)).join(' | ')));log('overflow',String(await pg.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth)));
log('console errors',errs.join('|')||'none');
await br.close();console.log(out.join('\n'));
