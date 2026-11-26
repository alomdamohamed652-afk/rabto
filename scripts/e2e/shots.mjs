import { createRequire } from "node:module"; const puppeteer=createRequire("/tmp/e2e/")("puppeteer-core");
const B=process.env.E2E_BASE_URL||'http://127.0.0.1:3111'; const out=[]; const log=(k,v)=>out.push(k+': '+v);
async function call(path,{method='GET',body,cookie}={}){const r=await fetch(B+path,{method,headers:{...(body?{'content-type':'application/json'}:{}),...(cookie?{cookie}:{})},body:body?JSON.stringify(body):undefined});let j=null;try{j=await r.json()}catch{};const sc=r.headers.get('set-cookie');return {s:r.status,j,cookie:sc?sc.split(';')[0]:null};}
let r=await call('/api/auth/login',{method:'POST',body:{email:'admin@test.local',password:'Admin-Test-Pass-123'}});const A=r.cookie;
const c=[];for(const n of ['a','b']){r=await call('/api/admin/customers',{method:'POST',cookie:A,body:{email:`sh-${n}@test.local`,workspaceName:'Sh '+n,workspaceSlug:'sh-'+n}});const tok=new URL(r.j.invitation.url).searchParams.get('token');const acc=await call('/api/auth/accept-invitation',{method:'POST',body:{token:tok,password:'Customer-Pass-'+n+'-1234'}});c.push({cookie:acc.cookie,ws:r.j.customer.workspace.id});}
const pts=[];for(const i of [0,1]){r=await call('/api/admin/product-types',{method:'POST',cookie:A,body:{workspaceId:c[i].ws,name:'Tag '+i,skuPrefix:'ORD'+i}});pts.push(r.j.productType.id);}
const mk=(over={},cookie=c[0].cookie,ws=c[0].ws)=>call('/api/customer/orders',{method:'POST',cookie,body:{workspaceId:ws,customerName:'منى',customerEmail:'mona@example.com',items:[{productTypeId:pts[0],quantity:2,unitPriceMinor:15000}],...over}});
const br=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox'],headless:'new'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const D='/downloads/shot-';
async function open(w,h,cookie,url,{lang}={}){const pg=await br.newPage();await pg.setViewport({width:w,height:h,deviceScaleFactor:2});if(cookie){const [n,v]=cookie.split('=');await pg.setCookie({name:n,value:v,url:B});}
 if(lang)await pg.setCookie({name:'rabto_lang',value:lang,url:B});await pg.goto(B+url,{waitUntil:'networkidle0'});return pg}
// demo data
const cu=c[0].cookie, ws=c[0].ws;
const menu={blocks:[{type:'menu',title:'قائمة الكافيه (بيانات تجريبية)',currency:'EGP',sections:[{name:'مشروبات ساخنة',items:[{name:'قهوة تركي',description:'بن محمّص طازج',priceMinor:6000,available:true},{name:'شاي بالنعناع',priceMinor:3500,available:true},{name:'سحلب',priceMinor:5500,available:false}]},{name:'حلويات',items:[{name:'كنافة بالقشطة',description:'تُقدّم ساخنة',priceMinor:9000,available:true}]}]}]};
const pr=await call('/api/customer/pages',{method:'POST',cookie:cu,body:{workspaceId:ws,title:'منيو كافيه نموذجي',slug:'demo',content:menu}});
await call('/api/customer/pages/publish',{method:'POST',cookie:cu,body:{workspaceId:ws,pageId:pr.j.pageId}});
for(const n of ['محمد علي','سارة أحمد']){await call('/api/customer/orders',{method:'POST',cookie:cu,body:{workspaceId:ws,customerName:n,items:[{productTypeId:pts[0],quantity:2,unitPriceMinor:15000}]}});}
const shots=[];
async function snap(name,pg,full=true){await sleep(500);await pg.screenshot({path:D+name+'.png',fullPage:full});shots.push(name);await pg.close();}
let pg=await open(390,844,null,'/',{lang:'ar'});await snap('01-landing-ar-phone',pg);
pg=await open(390,844,null,'/',{lang:'en'});await snap('02-landing-en-phone',pg);
pg=await open(1280,800,null,'/',{lang:'ar'});await snap('03-landing-ar-desktop',pg);
pg=await open(390,844,null,'/login',{lang:'ar'});await snap('04-login-ar-phone',pg,false);
pg=await open(390,844,cu,'/app',{lang:'ar'});await snap('05-customer-console-ar-phone-full',pg);
pg=await open(390,844,cu,'/app',{lang:'ar'});await pg.evaluate(()=>{const b=[...document.querySelectorAll('.menu-editor button')].find(x=>x.textContent.trim()==='تعديل');b.click()});await sleep(500);await pg.evaluate(()=>document.querySelector('.menu-form').scrollIntoView());await snap('06-menu-editor-open-ar-phone',pg,false);
pg=await open(390,844,null,'/p/sh-a/demo');await snap('07-public-menu-phone',pg);
pg=await open(390,844,cu,'/app',{lang:'en'});await snap('08-customer-console-en-phone-full',pg);
pg=await open(390,844,A,'/admin',{lang:'ar'});await snap('09-admin-ar-phone-full',pg);
pg=await open(1280,800,A,'/admin',{lang:'ar'});await snap('10-admin-ar-desktop',pg,false);
pg=await open(1280,800,cu,'/app',{lang:'ar'});await snap('11-customer-console-ar-desktop',pg,false);
await br.close();console.log(shots.join('\n'));
