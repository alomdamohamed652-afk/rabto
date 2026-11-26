import { createRequire } from "node:module"; const puppeteer=createRequire("/tmp/e2e/")("puppeteer-core");
const B=process.env.E2E_BASE_URL||'http://127.0.0.1:3111'; const SECRET=process.env.ANALYTICS_CONSUMER_SECRET||'e2e-analytics-secret-0123456789abcdef'; const out=[]; const log=(k,v)=>out.push(k+': '+v);
async function call(path,{method='GET',body,cookie,headers={},redirect}={}){const t0=Date.now();const r=await fetch(B+path,{method,redirect,headers:{...(body?{'content-type':'application/json'}:{}),...(cookie?{cookie}:{}),...headers},body:body?JSON.stringify(body):undefined});let j=null;try{j=await r.json()}catch{};const sc=r.headers.get('set-cookie');return {s:r.status,j,ms:Date.now()-t0,loc:r.headers.get('location'),cookie:sc?sc.split(';')[0]:null};}
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
let r=await call('/api/auth/login',{method:'POST',body:{email:'admin@test.local',password:'Admin-Test-Pass-123'}});const A=r.cookie;
const c=[];for(const n of ['a','b']){r=await call('/api/admin/customers',{method:'POST',cookie:A,body:{email:`pp-${n}@test.local`,workspaceName:'Pp '+n,workspaceSlug:'pp-'+n}});const tok=new URL(r.j.invitation.url).searchParams.get('token');const acc=await call('/api/auth/accept-invitation',{method:'POST',body:{token:tok,password:'Customer-Pass-'+n+'-1234'}});c.push({cookie:acc.cookie,ws:r.j.customer.workspace.id});}
r=await call('/api/admin/product-types',{method:'POST',cookie:A,body:{workspaceId:c[0].ws,name:'Tag',skuPrefix:'PPT'}});const pt=r.j.productType.id;
r=await call('/api/admin/batches',{method:'POST',cookie:A,body:{workspaceId:c[0].ws,productTypeId:pt,batchCode:'A1',quantity:1,initialDestinationUrl:'https://example.com/landing'}});
const qr=r.j.codes.find(x=>x.channel==="qr");
for(const code of [qr]){const a=await call('/api/customer/activate',{method:'POST',cookie:c[0].cookie,body:{workspaceId:c[0].ws,publicCode:code.publicCode,activationSecret:code.activationSecret}});log('activate qr (200/201)',a.s);}
for(let i=0;i<7;i++)await call('/d/'+qr.publicCode,{redirect:'manual'});
r=await call('/api/internal/analytics/consume',{method:'POST',headers:{authorization:'Bearer '+SECRET}});log('consumed',r.j?.processed);
r=await call('/api/customer/credits?workspaceId='+c[0].ws,{cookie:c[0].cookie});const acct=r.j.accounts[0]?.accountId;log('credit account exists',String(!!acct));
if(acct){for(const [k,a,t,why] of [['demo-key-0001',20,'credit','Initial grant (demo)'],['demo-key-0002',-3,'adjustment','Demo adjustment']]){const g=await call('/api/admin/credits',{method:'POST',cookie:A,body:{accountId:acct,entryType:t,amount:a,reason:why,idempotencyKey:k}});log('ledger '+t,g.s+' '+JSON.stringify(g.j).slice(0,160));}}
const br=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox'],headless:'new'});
const pg=await br.newPage();await pg.setViewport({width:390,height:844,deviceScaleFactor:2});
const [nm,val]=c[0].cookie.split('=');await pg.setCookie({name:nm,value:val,url:B});await pg.setCookie({name:'rabto_lang',value:'ar',url:B});
await pg.goto(B+'/app',{waitUntil:'networkidle0'});await sleep(800);
await pg.evaluate(()=>document.querySelector('#insights').scrollIntoView());await sleep(600);
log('panel text',await pg.$eval('#insights',e=>e.innerText.replace(/\n+/g,' | ').slice(0,260)));
const h=await pg.$eval('#insights',e=>Math.ceil(e.getBoundingClientRect().height));
await pg.setViewport({width:390,height:Math.min(2600,h+60),deviceScaleFactor:2});await sleep(400);await pg.evaluate(()=>document.querySelector('#insights').scrollIntoView());await sleep(400);
await pg.screenshot({path:'/downloads/insights-populated-phone.png'});
// invitation page (fresh invite)
r=await call('/api/admin/customers',{method:'POST',cookie:A,body:{email:'inv@test.local',workspaceName:'Inv',workspaceSlug:'inv-x'}});const url=r.j.invitation.url.replace(/^https?:\/\/[^/]+/,B);
const p2=await br.newPage();await p2.setViewport({width:390,height:844,deviceScaleFactor:2});await p2.setCookie({name:'rabto_lang',value:'ar',url:B});await p2.goto(url,{waitUntil:'networkidle0'});await p2.screenshot({path:'/downloads/invitation-phone.png'});
await br.close();console.log(out.join('\n'));
