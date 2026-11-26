import { execFileSync } from 'node:child_process';
const B=process.env.E2E_BASE_URL||'http://127.0.0.1:3111'; const out=[]; const log=(k,v)=>out.push(k+': '+v);
async function call(path,{method='GET',body,cookie,raw}={}){const r=await fetch(B+path,{method,headers:{...(body?{'content-type':'application/json'}:{}),...(cookie?{cookie}:{})},body:body?JSON.stringify(body):undefined});let j=null,t=null;if(raw)t=await r.text();else{try{j=await r.json()}catch{}};const sc=r.headers.get('set-cookie');return {s:r.status,j,t,h:r.headers,cookie:sc?sc.split(';')[0]:null};}
const psql=(sql)=>{try{return {ok:true,out:execFileSync('psql',['-At','rabto_e2e','-c',sql],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim()}}catch(e){return {ok:false,out:String(e.stderr||e.message).trim().split('\n')[0]}}};
let r=await call('/api/auth/login',{method:'POST',body:{email:'admin@test.local',password:'Admin-Test-Pass-123'}});const A=r.cookie;
const c=[];for(const n of ['a','b']){r=await call('/api/admin/customers',{method:'POST',cookie:A,body:{email:`mn-${n}@test.local`,workspaceName:'Menus '+n,workspaceSlug:'mn-'+n}});const tok=new URL(r.j.invitation.url).searchParams.get('token');const acc=await call('/api/auth/accept-invitation',{method:'POST',body:{token:tok,password:'Customer-Pass-'+n+'-1234'}});c.push({cookie:acc.cookie,ws:r.j.customer.workspace.id});}

const menu=(items,extra={})=>({blocks:[{type:'menu',title:'قائمة الطعام',currency:'EGP',sections:[{name:'مشروبات',items}],...extra}]});
const it=(o={})=>({name:'شاي',priceMinor:2500,available:true,...o});
r=await call('/api/customer/pages',{method:'POST',cookie:c[0].cookie,body:{workspaceId:c[0].ws,title:'منيو',slug:'menu',content:menu([it(),it({name:'قهوة <b>',priceMinor:4050}),it({name:'مخفي',available:false}),it({name:'صورة',imageUrl:'https://img.example.com/a.png'})])}});log('create menu draft (201)',r.s);const pid=r.j?.pageId;
r=await call('/p/mn-a/menu',{raw:true});log('menu not public before publish (404)',r.s);
r=await call('/api/customer/pages/publish',{method:'POST',cookie:c[0].cookie,body:{workspaceId:c[0].ws,pageId:pid}});log('publish (200)',r.s);
r=await call('/p/mn-a/menu',{raw:true});const t=r.t||'';
log('public menu 200',r.s);log('shows available items',String(t.includes('شاي')&&t.includes('صورة')));
log('hides unavailable item',String(!t.includes('مخفي')));
log('escapes item name',String(t.includes('قهوة &lt;b&gt;')&&!t.includes('قهوة <b>')));
log('price formatted from minor units',String(t.includes('25.00')&&t.includes('40.50')));
log('image https only and no cookie',String(t.includes('https://img.example.com/a.png')&&!r.h.get('set-cookie')));
for(const [n,bad] of [['fractional price',it({priceMinor:12.5})],['negative price',it({priceMinor:-1})],['http image',it({imageUrl:'http://x.example/a.png'})],['non-boolean available',it({available:'yes'})]]){r=await call('/api/customer/pages',{method:'POST',cookie:c[0].cookie,body:{workspaceId:c[0].ws,title:'x',slug:'bad-'+Math.floor(Math.random()*1e6),content:menu([bad])}});log(n+' rejected (400)',r.s);}
r=await call('/api/customer/pages',{method:'POST',cookie:c[0].cookie,body:{workspaceId:c[0].ws,title:'x',slug:'bad-cur',content:menu([it()],{currency:'egp'})}});log('lowercase currency rejected (400)',r.s);
r=await call('/api/customer/pages',{method:'POST',cookie:c[0].cookie,body:{workspaceId:c[0].ws,pageId:pid,title:'منيو',slug:'menu',content:menu([it({name:'تعديل غير منشور',priceMinor:1})])}});log('edit draft (200)',r.s);
r=await call('/p/mn-a/menu',{raw:true});log('unpublished edit not visible',String(!(r.t||'').includes('تعديل غير منشور')));
r=await call('/api/customer/pages/publish',{method:'POST',cookie:c[0].cookie,body:{workspaceId:c[0].ws,pageId:pid}});r=await call('/p/mn-a/menu',{raw:true});log('republish shows edit, price 0.01',String((r.t||'').includes('تعديل غير منشور')&&(r.t||'').includes('0.01')));
r=await call('/api/customer/pages',{method:'POST',cookie:c[1].cookie,body:{workspaceId:c[0].ws,title:'x',slug:'x1',content:menu([it()])}});log('other user cannot write my workspace (403)',r.s);
console.log(out.join('\n'));
