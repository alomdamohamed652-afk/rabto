// Links editor: validation, UI create/reorder/publish, public render, menu save keeps links + lang. Needs E2E_PROD=1 for screenshots.
import { createRequire } from "node:module"; const puppeteer=createRequire("/tmp/e2e/")("puppeteer-core");
const B=process.env.E2E_BASE_URL;let bad=0;const chk=(n,ok,d='')=>{console.log((ok?'PASS ':'FAIL ')+n+(d?' '+d:''));if(!ok)bad=1;};
async function call(path,{method='GET',body,cookie}={}){const r=await fetch(B+path,{method,headers:{...(body?{'content-type':'application/json'}:{}),...(cookie?{cookie}:{})},body:body?JSON.stringify(body):undefined});let j=null;try{j=await r.json()}catch{}return{s:r.status,j,cookie:(r.headers.getSetCookie?.()||[]).map(x=>x.split(';')[0]).join('; ')};}
const A=(await call('/api/auth/login',{method:'POST',body:{email:'admin@test.local',password:'Admin-Test-Pass-123'}})).cookie;
const c=await call('/api/admin/customers',{method:'POST',cookie:A,body:{email:'lk1@gmail.com',workspaceName:'Lk Cafe',workspaceSlug:'lk-cafe'}});
const ck=(await call('/api/auth/accept-invitation',{method:'POST',body:{token:new URL(c.j.invitation.url).searchParams.get('token'),password:'Lk1-Test-Pass-1234'}})).cookie;const ws=c.j.customer.workspace.id;
const save=(slug,blocks,extra={})=>call('/api/customer/pages',{method:'POST',cookie:ck,body:{workspaceId:ws,slug,title:'t',content:{blocks,...extra}}});
const P={type:'profile',name:'N'};
const bads=[['javascript url',{type:'social',platform:'website',url:'javascript:alert(1)'}],['http',{type:'social',platform:'website',url:'http://example.com'}],['credentials',{type:'social',platform:'website',url:'https://u:p@example.com'}],['wrong host',{type:'social',platform:'instagram',url:'https://evil.com/x'}],['lookalike host',{type:'social',platform:'facebook',url:'https://notfacebook.com/x'}],['bad wa',{type:'social',platform:'whatsapp',url:'123'}],['unknown platform',{type:'social',platform:'__proto__',url:'x.com'}],['bad email',{type:'social',platform:'email',url:'nope'}],['data avatar',{type:'profile',name:'N',avatarUrl:'data:image/png;base64,AA'}]];
for(const [n,b] of bads){const r=await save('b'+Math.random().toString(36).slice(2,8),[b.type==='profile'?b:P,b]);chk('rejects '+n,r.s===400,r.s);}
chk('rejects two profiles',(await save('two',[P,P])).s===400);
chk('rejects bad lang',(await save('bl',[P],{lang:'fr'})).s===400);
const okr=await save('okv',[P,{type:'social',platform:'whatsapp',url:'01064589298'},{type:'social',platform:'instagram',url:'instagram.com/x'}],{lang:'en'});chk('accepts valid',okr.s===201);
const br=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox'],headless:'new'});
const [n,...v]=ck.split('=');
for(const lang of ['en','ar']){
  const slug='ui-'+lang;const pg=await br.newPage();await pg.setCookie({name:n,value:v.join('='),url:B},{name:'rabto_lang',value:lang,url:B});
  await pg.setViewport({width:390,height:844,deviceScaleFactor:1.5});await pg.goto(B+'/app',{waitUntil:'networkidle0'});
  const clickText=async(sel,txt)=>pg.evaluate((sel,txt)=>{const el=[...document.querySelectorAll(sel)].find(e=>e.textContent.trim()===txt);if(el){el.click();return true}return false},sel,txt);
  const L=lang==='en'?{nw:'New links page',as:'Add account',al:'Add custom link',down:'Down',pub:'Publish',edit:'Edit'}:{nw:'صفحة روابط جديدة',as:'إضافة حساب',al:'إضافة رابط مخصص',down:'تحت',pub:'نشر',edit:'تعديل'};
  chk(lang+' open editor',await clickText('#links button',L.nw));
  await pg.waitForSelector('#links form');
  const ins=async()=>pg.$$('#links form input,#links form textarea,#links form select');
  const inputs=await ins();const nameIn=inputs[0];await nameIn.type('Lk '+lang);
  await pg.select('#links form select',lang);
  await pg.evaluate(()=>{const f=document.querySelector('#links form');const s=f.querySelectorAll('input')[3];s.value='';});
  const slugIn=(await pg.$$('#links form input'))[3];await slugIn.click({clickCount:3});await slugIn.type(slug);
  chk(lang+' add social',await clickText('#links button',L.as));
  await pg.waitForFunction(()=>document.querySelectorAll('#links .item-block').length===1);
  const val=async(i,t)=>{const els=await pg.$$('#links .item-block');const inp=(await els[i].$$('input'))[0];await inp.click({clickCount:3});await inp.type(t);};
  await val(0,'01064589298');
  chk(lang+' add 2nd',await clickText('#links button',L.as));await pg.waitForFunction(()=>document.querySelectorAll('#links .item-block').length===2);
  const sel2=(await pg.$$('#links .item-block'))[1];await (await sel2.$('select')).select('instagram');await val(1,'instagram.com/lkdemo');
  chk(lang+' add link',await clickText('#links button',L.al));await pg.waitForFunction(()=>document.querySelectorAll('#links .item-block').length===3);
  const b3=(await pg.$$('#links .item-block'))[2];const ii=await b3.$$('input');await ii[0].type('My shop');await ii[1].type('https://example.com/shop');
  // reorder: move first (whatsapp) down once -> instagram first
  await pg.evaluate((d)=>{const b=document.querySelector('#links .item-block');[...b.querySelectorAll('button')].find(x=>x.textContent.trim()===d).click()},L.down);
  chk(lang+' publish',await clickText('#links button',L.pub));
  await pg.waitForFunction(()=>/Published|تم النشر/.test(document.querySelector('#links .menu-msg')?.textContent||''));
  await (await pg.$('#links')).screenshot({path:`/downloads/lk-editor-${lang}-m.png`});
  const html=await (await fetch(B+'/p/lk-cafe/'+slug)).text();
  const i1=html.indexOf('instagram.com/lkdemo'),i2=html.indexOf('wa.me/201064589298'),i3=html.indexOf('example.com/shop');
  chk(lang+' public order instagram,whatsapp,custom',i1>0&&i2>i1&&i3>i2);
  chk(lang+' public dir',html.includes(`dir="${lang==='ar'?'rtl':'ltr'}"`)&&html.includes(`lang="${lang}"`));
  // menu editor save keeps links and lang
  await pg.reload({waitUntil:'networkidle0'});
  await pg.evaluate((slug)=>{const row=[...document.querySelectorAll('#menus .menu-row')].find(r=>r.textContent.includes('/'+slug));row.querySelectorAll('button')[0].click()},slug);
  await pg.waitForSelector('#menus form');
  await pg.evaluate(()=>{const f=document.querySelector('#menus form');const sec=f.querySelector('fieldset input');});
  const fi=await pg.$$('#menus fieldset > label input');await fi[0].type('Drinks');
  await pg.evaluate(()=>{[...document.querySelectorAll('#menus .item-card button')][0].click()});
  await pg.waitForSelector('#menus .menu-item');
  const mi=await pg.$$('#menus .menu-item input');await mi[0].type('Tea');await mi[1].type('12');
  await pg.evaluate(()=>{[...document.querySelectorAll('#menus form button')].find(b=>b.className.includes('solid')&&b.type==='button').click()});
  await pg.waitForFunction(()=>/Published|تم النشر/.test(document.querySelector('#menus .menu-msg')?.textContent||''));
  const h2=await (await fetch(B+'/p/lk-cafe/'+slug)).text();
  chk(lang+' after menu save: links kept',h2.includes('instagram.com/lkdemo')&&h2.includes('wa.me/201064589298')&&h2.includes('example.com/shop'));
  chk(lang+' after menu save: menu present, lang kept',h2.includes('Tea')&&h2.includes(`lang="${lang}"`));
  await pg.close();
}
await br.close();console.log(bad?'FAILED':'DONE');process.exit(bad);
