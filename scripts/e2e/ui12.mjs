// Admin batch history and reprint panel (demo batch).
import { createRequire } from "node:module"; const puppeteer=createRequire("/tmp/e2e/")("puppeteer-core");
const B=process.env.E2E_BASE_URL;
async function call(path,{method='GET',body,cookie}={}){const r=await fetch(B+path,{method,headers:{...(body?{'content-type':'application/json'}:{}),...(cookie?{cookie}:{})},body:body?JSON.stringify(body):undefined});let j=null;try{j=await r.json()}catch{}return{s:r.status,j,cookie:(r.headers.get('set-cookie')||'').split(';')[0]}}
const A=(await call('/api/auth/login',{method:'POST',body:{email:'admin@test.local',password:'Admin-Test-Pass-123'}})).cookie;
const c=await call('/api/admin/customers',{method:'POST',cookie:A,body:{email:'demo@gmail.com',workspaceName:'Demo co',workspaceSlug:'demo-co'}});
const ws=c.j.customer.workspace.id;const pt=(await call('/api/admin/product-types',{method:'POST',cookie:A,body:{workspaceId:ws,name:'Keychain',skuPrefix:'KEY'}})).j.productType.id;
await call('/api/admin/batches',{method:'POST',cookie:A,body:{workspaceId:ws,productTypeId:pt,batchCode:'DEMO-1',quantity:3,initialDestinationUrl:'https://example.com/demo'}});
const br=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox'],headless:'new'});
const ap=await br.newPage();await ap.setViewport({width:1100,height:900});
await ap.setCookie({name:A.split('=')[0],value:A.split('=').slice(1).join('='),url:B});
await ap.goto(B+'/admin',{waitUntil:'networkidle0'});await new Promise(r=>setTimeout(r,800));
const el=await ap.$('#batch-history');console.log('panel present',!!el);
const btn=await el.$('button.admin-secondary');await btn.click();await new Promise(r=>setTimeout(r,1500));
console.log('codes shown',(await el.evaluate(e=>e.innerText)).includes('rabto')||(await el.evaluate(e=>e.innerText.length))>200);
await el.screenshot({path:'/downloads/batch-history.png'});await br.close();
