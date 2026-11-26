import { createRequire } from "node:module"; const puppeteer=createRequire("/tmp/e2e/")("puppeteer-core");
const B=process.env.E2E_BASE_URL||'http://127.0.0.1:3111'; const out=[]; const log=(k,v)=>out.push(k+': '+v);
async function call(path,{method='GET',body,cookie}={}){const r=await fetch(B+path,{method,headers:{...(body?{'content-type':'application/json'}:{}),...(cookie?{cookie}:{})},body:body?JSON.stringify(body):undefined});let j=null;try{j=await r.json()}catch{};const sc=r.headers.get('set-cookie');return {s:r.status,j,cookie:sc?sc.split(';')[0]:null};}
let r=await call('/api/auth/login',{method:'POST',body:{email:'admin@test.local',password:'Admin-Test-Pass-123'}});const A=r.cookie;
const c=[];for(const n of ['a','b']){r=await call('/api/admin/customers',{method:'POST',cookie:A,body:{email:`ou-${n}@test.local`,workspaceName:'Ord '+n,workspaceSlug:'ou-'+n}});const tok=new URL(r.j.invitation.url).searchParams.get('token');const acc=await call('/api/auth/accept-invitation',{method:'POST',body:{token:tok,password:'Customer-Pass-'+n+'-1234'}});c.push({cookie:acc.cookie,ws:r.j.customer.workspace.id});}
const pts=[];for(const i of [0,1]){r=await call('/api/admin/product-types',{method:'POST',cookie:A,body:{workspaceId:c[i].ws,name:'Tag '+i,skuPrefix:'ORD'+i}});pts.push(r.j.productType.id);}
const mk=(over={},cookie=c[0].cookie,ws=c[0].ws)=>call('/api/customer/orders',{method:'POST',cookie,body:{workspaceId:ws,customerName:'منى',customerEmail:'mona@example.com',items:[{productTypeId:pts[0],quantity:2,unitPriceMinor:15000}],...over}});
const br=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox'],headless:'new'});
const pg=await br.newPage();await pg.setViewport({width:390,height:844,deviceScaleFactor:2});
const [nm,val]=c[0].cookie.split('=');await pg.setCookie({name:nm,value:val,url:B});
const errs=[];pg.on('pageerror',e=>errs.push(e.message));pg.on('console',m=>{if(m.type()==='error'&&!m.text().includes('404'))errs.push(m.text())});
await pg.goto(B+'/app',{waitUntil:'networkidle0'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const btn=async(txt)=>{const ok=await pg.evaluate((t)=>{const b=[...document.querySelectorAll('.orders-panel button')].find(x=>x.textContent.trim()===t&&!x.disabled);if(b){b.scrollIntoView({block:'center'});b.click();return true}return false},txt);if(!ok)throw new Error('no button '+txt);await sleep(700)};
const fill=async(sel,v)=>{await pg.evaluate((s)=>{const e=document.querySelector(s);e.scrollIntoView({block:'center'});e.focus();e.select&&e.select()},sel);await pg.keyboard.type(v)};
await btn('طلب جديد');
log('attrs',(await pg.$$eval('.orders-panel input',els=>els.map(e=>[e.getAttribute('inputmode'),e.type].join('|')))).join(' ; '));
await fill('.orders-panel .menu-grid input','منى');
await fill('.orders-panel .menu-item input[inputmode=numeric]','3');
await fill('.orders-panel .menu-item input[inputmode=decimal]','150,50');
await pg.screenshot({path:'/downloads/ui-orders-form-phone.png'});
await btn('إنشاء الطلب');await sleep(800);
const list=await pg.$eval('.orders-panel',e=>e.innerText);log('order listed',String(list.includes('OR-')||list.includes('RB-')));log('total 451.50',String(list.includes('451.50')));
await btn('تأكيد');log('after confirm',String((await pg.$eval('.orders-panel',e=>e.innerText)).includes('مؤكد')));
await btn('تم التسليم');log('after fulfill',String((await pg.$eval('.orders-panel',e=>e.innerText)).includes('تم التسليم')));
log('no further actions on fulfilled',String(!(await pg.$eval('.orders-panel',e=>e.innerText)).includes('إلغاء الطلب')));
await pg.evaluate(()=>document.querySelector('#orders').scrollIntoView());await pg.screenshot({path:'/downloads/ui-orders-list-phone.png'});
log('overflow',String(await pg.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth)));
log('console errors',errs.join('|')||'none');
await br.close();console.log(out.join('\n'));
