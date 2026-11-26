import { execFileSync } from 'node:child_process';
const B=process.env.E2E_BASE_URL||'http://127.0.0.1:3111'; const SECRET=process.env.ANALYTICS_CONSUMER_SECRET||'e2e-analytics-secret-0123456789abcdef'; const out=[]; const log=(k,v)=>out.push(k+': '+v);
async function call(path,{method='GET',body,cookie,headers={},redirect}={}){const t0=Date.now();const r=await fetch(B+path,{method,redirect,headers:{...(body?{'content-type':'application/json'}:{}),...(cookie?{cookie}:{}),...headers},body:body?JSON.stringify(body):undefined});let j=null;try{j=await r.json()}catch{};const sc=r.headers.get('set-cookie');return {s:r.status,j,ms:Date.now()-t0,loc:r.headers.get('location'),cookie:sc?sc.split(';')[0]:null};}
const psql=(sql)=>{try{return {ok:true,out:execFileSync('psql',['-At','rabto_e2e','-c',sql],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim()}}catch(e){return {ok:false,out:String(e.stderr||e.message).trim().split('\n')[0]}}};
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
let r=await call('/api/auth/login',{method:'POST',body:{email:'admin@test.local',password:'Admin-Test-Pass-123'}});const A=r.cookie;
const c=[];for(const n of ['a','b']){r=await call('/api/admin/customers',{method:'POST',cookie:A,body:{email:`an-${n}@test.local`,workspaceName:'An '+n,workspaceSlug:'an-'+n}});const tok=new URL(r.j.invitation.url).searchParams.get('token');const acc=await call('/api/auth/accept-invitation',{method:'POST',body:{token:tok,password:'Customer-Pass-'+n+'-1234'}});c.push({cookie:acc.cookie,ws:r.j.customer.workspace.id});}
r=await call('/api/admin/product-types',{method:'POST',cookie:A,body:{workspaceId:c[0].ws,name:'Tag',skuPrefix:'ANT'}});const pt=r.j.productType.id;
r=await call('/api/admin/batches',{method:'POST',cookie:A,body:{workspaceId:c[0].ws,productTypeId:pt,batchCode:'A1',quantity:1,initialDestinationUrl:'https://example.com/landing'}});
const qr=r.j.codes.find(x=>x.channel==="qr");
for(const code of [qr]){const a=await call('/api/customer/activate',{method:'POST',cookie:c[0].cookie,body:{workspaceId:c[0].ws,publicCode:code.publicCode,activationSecret:code.activationSecret}});log('activate qr (200/201)',a.s);}
const hit=(code)=>call('/d/'+code,{redirect:'manual'});
r=await hit(qr.publicCode);log('redirect still 302 to destination',r.s+' '+r.loc);
await sleep(800);
log('first scan recorded as event',psql(`select count(*) from scan_events`).out);
// load: 40 scans, measure redirect latency
const lat=[];let res=await Promise.all(Array.from({length:40},async()=>{const x=await hit(qr.publicCode);lat.push(x.ms);return x.s}));
log('40 concurrent scans all 302',String(res.every(s=>s===302)));lat.sort((a,b)=>a-b);log('redirect latency ms p50/max',lat[20]+'/'+lat[39]);
await sleep(1500);
log('pool regression: server connections after 40 concurrent scans <= 15',psql(`select count(*) from pg_stat_activity where datname='rabto_e2e' and pid<>pg_backend_pid()`).out);
log('events queued (expect 41, all unprocessed)',psql(`select count(*)||' unprocessed='||count(*) filter (where processed_at is null) from scan_events`).out);
log('daily stats empty before consume',psql(`select count(*) from daily_scan_stats`).out);
// auth
r=await call('/api/internal/analytics/consume',{method:'POST'});log('consume without secret (401)',r.s);
r=await call('/api/internal/analytics/consume',{method:'POST',headers:{authorization:'Bearer wrong-secret-wrong-secret-1234'}});log('consume wrong secret (401)',r.s);
r=await call('/api/internal/analytics/consume',{method:'POST',cookie:A});log('consume with admin session only (401)',r.s);
// concurrent consumers
const cons=await Promise.all(Array.from({length:4},()=>call('/api/internal/analytics/consume',{method:'POST',headers:{authorization:'Bearer '+SECRET}})));
log('4 concurrent consumers',JSON.stringify(cons.map(x=>x.s+':'+x.j?.processed)));
log('processed sums to 41 (exactly once)',String(cons.reduce((n,x)=>n+(x.j?.processed||0),0)));
log('all events marked processed',psql(`select count(*) filter (where processed_at is null) from scan_events`).out);
log('daily stats total = 41',psql(`select sum(scans) from daily_scan_stats`).out+' rows='+psql(`select count(*) from daily_scan_stats`).out);
r=await call('/api/internal/analytics/consume',{method:'POST',headers:{authorization:'Bearer '+SECRET}});log('re-run consume processes 0',r.j?.processed);
log('stats unchanged after re-run',psql(`select sum(scans) from daily_scan_stats`).out);
// failure path: break the table, redirect must still work
psql(`alter table scan_events rename to scan_events_off`);
r=await hit(qr.publicCode);log('redirect works with analytics table broken (302)',r.s+' '+r.ms+'ms');
await sleep(500);psql(`alter table scan_events_off rename to scan_events`);
r=await hit(qr.publicCode);await sleep(800);
log('recovers after table restored (1 new event)',psql(`select count(*) filter (where processed_at is null) from scan_events`).out);
// dashboard
r=await call('/api/customer/analytics?workspaceId='+c[0].ws+'&days=7',{cookie:c[0].cookie});log('owner reads stats (200)',r.s+' total='+r.j?.daily?.reduce((n,d)=>n+d.scans,0)+' products='+r.j?.byProduct?.length);
r=await call('/api/customer/analytics?workspaceId='+c[0].ws,{cookie:c[1].cookie});log('other workspace reads (403)',r.s);
r=await call('/api/customer/analytics?workspaceId='+c[0].ws);log('anonymous (401)',r.s);
r=await call('/api/customer/analytics?workspaceId='+c[1].ws,{cookie:c[1].cookie});log('other workspace sees none of mine',JSON.stringify(r.j?.daily));
// unknown code: 404 and no new event
const before=psql(`select count(*) from scan_events`).out;
r=await hit('ZZZZZZZZ1234');await sleep(500);log('unknown code 404, no event',r.s+' same='+(psql(`select count(*) from scan_events`).out===before));
// contention: 6000 queued events, 4 concurrent consumers, each processes disjoint batches
r=await call('/api/internal/analytics/consume',{method:'POST',headers:{authorization:'Bearer '+SECRET}});
const pid=psql(`select product_id from scan_events limit 1`).out;
const pre=psql(`select sum(scans) from daily_scan_stats`).out;
psql(`insert into scan_events (id,workspace_id,product_id,channel,occurred_at) select gen_random_uuid(),'${c[0].ws}','${pid}','qr',now() from generate_series(1,6000)`);
const cons2=await Promise.all(Array.from({length:4},()=>call('/api/internal/analytics/consume',{method:'POST',headers:{authorization:'Bearer '+SECRET}})));
log('contention: 4 consumers on 6000 events',JSON.stringify(cons2.map(x=>x.j?.processed)));
log('contention: processed total = 6000',String(cons2.reduce((n,x)=>n+(x.j?.processed||0),0)));
log('contention: stats grew by exactly 6000',String(Number(psql(`select sum(scans) from daily_scan_stats`).out)-Number(pre)));
log('contention: nothing left unprocessed',psql(`select count(*) from scan_events where processed_at is null`).out);
console.log(out.join('\n'));
