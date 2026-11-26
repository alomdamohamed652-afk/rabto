import { createRequire } from "node:module"; const puppeteer=createRequire("/tmp/e2e/")("puppeteer-core");
const B=process.env.E2E_BASE_URL||'http://127.0.0.1:3111'; const out=[]; const log=(k,v)=>out.push(k+': '+v);
async function call(path,{method='GET',body,cookie}={}){const r=await fetch(B+path,{method,headers:{...(body?{'content-type':'application/json'}:{}),...(cookie?{cookie}:{})},body:body?JSON.stringify(body):undefined});let j=null;try{j=await r.json()}catch{};const sc=r.headers.get('set-cookie');return {s:r.status,j,cookie:sc?sc.split(';')[0]:null};}
let r=await call('/api/auth/login',{method:'POST',body:{email:'admin@test.local',password:'Admin-Test-Pass-123'}});const A=r.cookie;
const c=[];for(const n of ['a','b']){r=await call('/api/admin/customers',{method:'POST',cookie:A,body:{email:`cd-${n}@test.local`,workspaceName:'Ord '+n,workspaceSlug:'cd-'+n}});const tok=new URL(r.j.invitation.url).searchParams.get('token');const acc=await call('/api/auth/accept-invitation',{method:'POST',body:{token:tok,password:'Customer-Pass-'+n+'-1234'}});c.push({cookie:acc.cookie,ws:r.j.customer.workspace.id});}
const pts=[];for(const i of [0,1]){r=await call('/api/admin/product-types',{method:'POST',cookie:A,body:{workspaceId:c[i].ws,name:'Tag '+i,skuPrefix:'ORD'+i}});pts.push(r.j.productType.id);}
const mk=(over={},cookie=c[0].cookie,ws=c[0].ws)=>call('/api/customer/orders',{method:'POST',cookie,body:{workspaceId:ws,customerName:'منى',customerEmail:'mona@example.com',items:[{productTypeId:pts[0],quantity:2,unitPriceMinor:15000}],...over}});
const br=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox'],headless:'new'});
const pg=await br.newPage();await pg.setViewport({width:390,height:844,deviceScaleFactor:3});
const [nm,val]=A.split('=');await pg.setCookie({name:nm,value:val,url:B});
const errs=[];pg.on('pageerror',e=>errs.push(e.message));pg.on('console',m=>{if(m.type()==='error'&&!m.text().includes('404'))errs.push(m.text())});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
await pg.goto(B+'/admin',{waitUntil:'networkidle0'});
await pg.evaluate(()=>{const r=[...document.querySelectorAll('.customer-row')].find(x=>x.textContent.includes('cd-a')||x.textContent.includes('Cd a'))||document.querySelector('.customer-row');r.click()});await sleep(1200);
await pg.evaluate(()=>{const s=document.querySelector('#provisioning select[required]');s.scrollIntoView();});
const opts=await pg.$$eval('#provisioning select[required] option',o=>o.map(x=>x.value).filter(Boolean));log('product types offered',String(opts.length));
await pg.select('#provisioning select[required]',opts[0]);
await pg.evaluate(()=>{const e=document.querySelector('input[placeholder="BATCH-001"]');e.scrollIntoView({block:'center'});e.focus()});await pg.keyboard.type('QR-1');
await pg.evaluate(()=>{const e=document.querySelector('#provisioning input[type=number]');e.focus();e.select()});await pg.keyboard.type('1');
await pg.evaluate(()=>{const e=document.querySelector('input[type=url]');e.focus();e.select()});await pg.keyboard.type('https://example.com/menu');
await pg.evaluate(()=>{document.querySelector('.admin-primary:not([type=button])').scrollIntoView({block:'center'});});await sleep(400);
await pg.evaluate(()=>document.querySelector('input[placeholder="BATCH-001"]').form.querySelector('.admin-primary').click());await sleep(3000);
log('alerts',await pg.evaluate(()=>[...document.querySelectorAll('.admin-error,.admin-notice,[role=alert]')].map(e=>e.textContent).join('|')));log('form vals',await pg.evaluate(()=>[...document.querySelectorAll('.admin-form')].map(f=>[...f.querySelectorAll('input,select')].map(i=>i.value).join('/')).join(' ## ')));const n=await pg.$$eval('.code-tool',e=>e.length);log('rows',String(n));
if(!n){console.log(out.join('\n'));process.exit(1)}
log('capability text shown on non-NFC headless',String(await pg.$eval('.code-tools',e=>e.innerText.includes('Chrome')||e.innerText.includes('أندرويد'))));
log('write button absent without Web NFC',String(!(await pg.$$eval('.code-tool .admin-primary',e=>e.length))));
const qr=await pg.$('.code-tool .qr-box');const urlTxt=await pg.$eval('.code-tool code',e=>e.textContent);
await qr.screenshot({path:'/tmp/qr-shot.png'});log('url',urlTxt.replace(/d\/.*/,'d/<code>'));
await pg.evaluate(()=>document.querySelector('.code-tools').scrollIntoView());await sleep(400);await pg.screenshot({path:'/downloads/admin-qr-phone.png'});
await pg.screenshot({path:'/tmp/qr-url.txt.png',clip:{x:0,y:0,width:1,height:1}});
(await import('node:fs')).writeFileSync('/tmp/qr-expected.txt',urlTxt);
log('origin warning shown on localhost',String(await pg.$$eval('.code-tools [role=alert]',e=>e.length>0)));
log('download/copy disabled on localhost',String(await pg.$$eval('.code-tool button.admin-secondary',b=>b.length>0&&b.every(x=>x.disabled))));
for(const k of ['classic','rounded','dots','sage']){await pg.select('.code-tools select',k);await sleep(500);const el=await pg.$('.code-tool .qr-box');await el.screenshot({path:'/tmp/qr-style-'+k+'.png'});}
await pg.evaluate(()=>document.querySelector('.code-tools input[type=checkbox]').click());await sleep(500);{const el=await pg.$('.code-tool .qr-box');await el.screenshot({path:'/tmp/qr-style-sage-wm.png'});}
await pg.select('.code-tools select','rounded');await sleep(400);await pg.evaluate(()=>document.querySelector('.code-tools').scrollIntoView());await sleep(300);await pg.screenshot({path:'/downloads/admin-qr-styles-phone.png'});
log('presets offered',String(await pg.$$eval('.code-tools select option',o=>o.length)));
log('console errors',errs.join('|')||'none');
await br.close();console.log(out.join('\n'));
