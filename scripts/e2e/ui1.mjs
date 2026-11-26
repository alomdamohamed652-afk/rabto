import { execFileSync } from "node:child_process"; import { createRequire } from "node:module"; const puppeteer=createRequire("/tmp/e2e/")("puppeteer-core");
const B=process.env.E2E_BASE_URL||'http://127.0.0.1:3111'; const out=[]; const log=(k,v)=>out.push(k+': '+v);
async function call(path,{method='GET',body,cookie,raw}={}){const r=await fetch(B+path,{method,headers:{...(body?{'content-type':'application/json'}:{}),...(cookie?{cookie}:{})},body:body?JSON.stringify(body):undefined});let j=null,t=null;if(raw)t=await r.text();else{try{j=await r.json()}catch{}};const sc=r.headers.get('set-cookie');return {s:r.status,j,t,h:r.headers,cookie:sc?sc.split(';')[0]:null};}
const psql=(sql)=>{try{return {ok:true,out:execFileSync('psql',['-At','rabto_e2e','-c',sql],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim()}}catch(e){return {ok:false,out:String(e.stderr||e.message).trim().split('\n')[0]}}};
let r=await call('/api/auth/login',{method:'POST',body:{email:'admin@test.local',password:'Admin-Test-Pass-123'}});const A=r.cookie;
const c=[];for(const n of ['a','b']){r=await call('/api/admin/customers',{method:'POST',cookie:A,body:{email:`ui-${n}@test.local`,workspaceName:'UI '+n,workspaceSlug:'ui-'+n}});const tok=new URL(r.j.invitation.url).searchParams.get('token');const acc=await call('/api/auth/accept-invitation',{method:'POST',body:{token:tok,password:'Customer-Pass-'+n+'-1234'}});c.push({cookie:acc.cookie,ws:r.j.customer.workspace.id});}
const br=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox'],headless:'new'});
const pg=await br.newPage();await pg.setViewport({width:390,height:844,deviceScaleFactor:2});
const [nm,val]=c[0].cookie.split('=');await pg.setCookie({name:nm,value:val,url:B});
const errs=[];pg.on('pageerror',e=>errs.push(e.message));pg.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
await pg.goto(B+'/app',{waitUntil:'networkidle0'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const clickText=async(txt)=>{const ok=await pg.evaluate((t)=>{const b=[...document.querySelectorAll('.menu-editor button')].find(x=>x.textContent.trim()===t);if(b){b.click();return true}return false},txt);if(!ok)throw new Error('no button '+txt);await sleep(400)};
const type=async(sel,v)=>{await pg.click(sel,{clickCount:3});await pg.type(sel,v)};
log('editor visible',String(!!(await pg.$('#menus'))));
await clickText('منيو جديد');
const form=await pg.$('.menu-form');log('form open',String(!!form));
const nIn=await pg.$$eval('.menu-form input',els=>els.map(e=>[e.getAttribute('inputmode'),e.type,e.getAttribute('autocomplete'),e.getAttribute('autocapitalize')].join('|')));log('input attrs',nIn.join(' ; '));
const inputs=await pg.$$('.menu-form input:not([type=checkbox])');
await inputs[0].type('منيو الكافيه');await inputs[1].type('cafe');
await inputs[3].type('مشروبات');await inputs[4].type('شاي');await inputs[5].type('25,5');
await pg.screenshot({path:'/downloads/ui-menu-editor-phone-1.png',fullPage:true});
await clickText('نشر');await sleep(1500);
const msg=await pg.$eval('.menu-msg',e=>e.textContent).catch(()=>'none');log('publish message',msg);
const pub=await call('/p/ui-a/cafe',{raw:true});log('public 200',pub.s+' price shown: '+String((pub.t||'').includes('25.50')));
// bad price
await pg.evaluate(()=>{const e=document.querySelector('.menu-item input[inputmode=decimal]');e.scrollIntoView({block:'center'});e.focus();e.select()});await pg.keyboard.type('abc');const m0=await pg.evaluate(()=>[...document.querySelectorAll('.menu-msg,.admin-error')].map(e=>e.textContent).join('|'));log('before save click msg',m0);await clickText('حفظ المسودة');await sleep(1000);
log('price value',await pg.$eval('.menu-item input[inputmode=decimal]',e=>e.value));log('page errors text',await pg.evaluate(()=>[...document.querySelectorAll('[role=alert],.admin-error,.menu-msg')].map(e=>e.textContent).join('|')));
await pg.screenshot({path:'/downloads/ui-menu-editor-phone-2.png',fullPage:true});
log('overflow',String(await pg.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth)));
log('console errors',errs.join('|')||'none');
await br.close();
console.log(out.join('\n'));
