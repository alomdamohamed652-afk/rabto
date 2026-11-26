import { execFileSync } from 'node:child_process';
const B=process.env.E2E_BASE_URL||'http://127.0.0.1:3111'; const out=[]; const log=(k,v)=>out.push(k+': '+v);
async function call(path,{method='GET',body,cookie}={}){const r=await fetch(B+path,{method,headers:{...(body?{'content-type':'application/json'}:{}),...(cookie?{cookie}:{})},body:body?JSON.stringify(body):undefined});let j=null;try{j=await r.json()}catch{};const sc=r.headers.get('set-cookie');return {s:r.status,j,cookie:sc?sc.split(';')[0]:null};}
const psql=(sql)=>{try{return {ok:true,out:execFileSync('psql',['-At','rabto_e2e','-c',sql],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim()}}catch(e){return {ok:false,out:String(e.stderr||e.message).trim().split('\n')[0]}}};
let r=await call('/api/auth/login',{method:'POST',body:{email:'admin@test.local',password:'Admin-Test-Pass-123'}});const A=r.cookie;
const c=[];for(const n of ['a','b']){r=await call('/api/admin/customers',{method:'POST',cookie:A,body:{email:`ord-${n}@test.local`,workspaceName:'Ord '+n,workspaceSlug:'ord-'+n}});const tok=new URL(r.j.invitation.url).searchParams.get('token');const acc=await call('/api/auth/accept-invitation',{method:'POST',body:{token:tok,password:'Customer-Pass-'+n+'-1234'}});c.push({cookie:acc.cookie,ws:r.j.customer.workspace.id});}
const pts=[];for(const i of [0,1]){r=await call('/api/admin/product-types',{method:'POST',cookie:A,body:{workspaceId:c[i].ws,name:'Tag '+i,skuPrefix:'ORD'+i}});pts.push(r.j.productType.id);}
const mk=(over={},cookie=c[0].cookie,ws=c[0].ws)=>call('/api/customer/orders',{method:'POST',cookie,body:{workspaceId:ws,customerName:'منى',customerEmail:'mona@example.com',items:[{productTypeId:pts[0],quantity:2,unitPriceMinor:15000}],...over}});
r=await mk();log('create in-stock order (201)',r.s+' '+r.j?.orderNumber);const id=r.j?.id;
r=await mk({fulfillmentType:'pre_order',depositMinor:10000});log('pre-order with deposit (201)',r.s+' '+r.j?.orderNumber);const pre=r.j?.id;
r=await mk({fulfillmentType:'backorder'});log('backorder (201)',r.s);
r=await mk({depositMinor:99999999});log('deposit above total (400)',r.s);
r=await mk({fulfillmentType:'later'});log('invalid fulfillment type (400)',r.s);
r=await mk({items:[{productTypeId:pts[1],quantity:1,unitPriceMinor:1}]});log('product type from other workspace (400)',r.s);
r=await mk({subtotalMinor:1});log('client subtotal ignored',psql(`select subtotal_minor from orders where id='${id}'`).out);
const rs=await Promise.all(Array.from({length:8},()=>mk()));log('8 concurrent creates give unique numbers',String(new Set(rs.map(x=>x.j?.orderNumber)).size)+' statuses '+JSON.stringify([...new Set(rs.map(x=>x.s))]));
log('numbers contiguous',psql(`select min(order_number)||'..'||max(order_number)||' n='||count(*) from orders where workspace_id='${c[0].ws}'`).out);
r=await mk({items:[{productTypeId:pts[1],quantity:1,unitPriceMinor:5}]},c[1].cookie,c[1].ws);log('other workspace numbering starts at 1',r.j?.orderNumber);
r=await mk({},c[1].cookie,c[0].ws);log('other user creating in my workspace (403)',r.s);
r=await call('/api/customer/orders',{method:'POST',body:{workspaceId:c[0].ws}});log('anonymous create (401)',r.s);
const up=(i,body,cookie=c[0].cookie,ws=c[0].ws)=>call('/api/customer/orders/'+i,{method:'PATCH',cookie,body:{workspaceId:ws,...body}});
r=await up(id,{status:'fulfilled'});log('pending->fulfilled blocked (409)',r.s);
r=await up(id,{status:'confirmed'});log('pending->confirmed (200)',r.s);
r=await up(pre,{depositStatus:'received',notes:'cash at pickup'});log('record deposit received (200)',r.s);
r=await up(id,{status:'fulfilled'});log('confirmed->fulfilled (200)',r.s);
r=await up(id,{status:'cancelled'});log('fulfilled->cancelled blocked (409)',r.s);
const conc=await Promise.all(Array.from({length:6},()=>up(pre,{status:'confirmed'})));log('6 concurrent confirms: exactly one 200',JSON.stringify(conc.map(x=>x.s).sort()));
r=await up(id,{status:'paid'});log('unknown status (400)',r.s);
r=await up(id,{status:'cancelled'},c[1].cookie,c[1].ws);log('other workspace cannot touch my order (404)',r.s);
r=await call('/api/customer/orders/'+id+'?workspaceId='+c[0].ws,{cookie:c[0].cookie});log('get order with items (200)',r.s+' items='+r.j?.order?.items?.length+' status='+r.j?.order?.status);
r=await call('/api/customer/orders?workspaceId='+c[0].ws+'&status=confirmed',{cookie:c[0].cookie});log('list filter by status (200)',r.s+' n='+r.j?.orders?.length);
r=await call('/api/customer/orders?workspaceId='+c[0].ws,{cookie:c[1].cookie});log('other workspace list (403)',r.s);
log('no charge column or payment records exist',psql(`select count(*) from information_schema.columns where table_name='orders' and column_name ilike '%payment%'`).out);
let p=psql(`insert into orders (workspace_id,order_number,customer_name,subtotal_minor,deposit_minor) values ('${c[0].ws}','X',' x',10,20)`);log('DB rejects deposit > total',p.ok?'NOT BLOCKED':p.out);
console.log(out.join('\n'));
