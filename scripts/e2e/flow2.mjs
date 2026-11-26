const B=process.env.E2E_BASE_URL||'http://127.0.0.1:3111'; const out=[]; const log=(k,v)=>out.push(k+': '+v);
async function call(path,{method='GET',body,cookie}={}){const r=await fetch(B+path,{method,redirect:'manual',headers:{...(body?{'content-type':'application/json'}:{}),...(cookie?{cookie}:{})},body:body?JSON.stringify(body):undefined});let j=null;try{j=await r.clone().json()}catch{};const sc=r.headers.get('set-cookie');return {s:r.status,j,cookie:sc?sc.split(';')[0]:null,loc:r.headers.get('location'),cc:r.headers.get('cache-control')};}
let r=await call('/api/auth/login',{method:'POST',body:{email:'admin@test.local',password:'Admin-Test-Pass-123'}}); const A=r.cookie; log('admin login',r.s);
const c=[];
for(const n of ['a','b']){r=await call('/api/admin/customers',{method:'POST',cookie:A,body:{email:'cust-'+n+'@test.local',workspaceName:'Shop '+n,workspaceSlug:'shop-'+n}});const tok=new URL(r.j.invitation.url).searchParams.get('token');const ws=r.j.customer.workspace.id;const acc=await call('/api/auth/accept-invitation',{method:'POST',body:{token:tok,password:'Customer-Pass-'+n+'-1234'}});c.push({cookie:acc.cookie,ws});}
r=await call('/api/admin/product-types',{method:'POST',cookie:A,body:{workspaceId:c[0].ws,name:'Keychain',skuPrefix:'KEY'}});const pt=r.j.productType.id;
r=await call('/api/admin/batches',{method:'POST',cookie:A,body:{workspaceId:c[0].ws,productTypeId:pt,batchCode:'B1',quantity:3,initialDestinationUrl:'https://example.com/a?x=1'}});log('batch',r.s);
const codes=r.j.issuedCodes||r.j.codes||[];log('codes',codes.length+' keys='+Object.keys(codes[0]||{}));
const p0=codes.filter(x=>x.productId===codes[0].productId);const qr=p0.find(x=>x.channel==='qr'),nfc=p0.find(x=>x.channel==='nfc');
r=await call('/d/'+qr.publicCode);log('scan BEFORE activation',r.s+' loc='+r.loc);
const act=(code,cookie,ws=c[0].ws)=>call('/api/customer/activate',{method:'POST',cookie,body:{workspaceId:ws,publicCode:code.publicCode,activationSecret:code.activationSecret}});
r=await act(qr);log('activate anonymous',(await call('/api/customer/activate',{method:'POST',body:{workspaceId:c[0].ws,publicCode:qr.publicCode,activationSecret:qr.activationSecret}})).s);
r=await act(qr,c[1].cookie);log('activate by other workspace user (expect 404)',r.s);
r=await act(qr,c[1].cookie,c[1].ws);log('activate A code claiming B workspace (expect 404)',r.s);
r=await act({...qr,activationSecret:'x'.repeat(40)},c[0].cookie);log('wrong secret (expect 404)',r.s);
r=await act(qr,c[0].cookie);log('activate QR correct',r.s+' '+JSON.stringify(r.j));
r=await act(qr,c[0].cookie);log('activate QR again (expect 409)',r.s);
r=await act(nfc,c[0].cookie);log('activate NFC after QR (expect 409)',r.s);
r=await call('/d/'+qr.publicCode);log('scan QR after',r.s+' loc='+r.loc+' cc='+r.cc);
r=await call('/d/'+nfc.publicCode);log('scan NFC after',r.s+' loc='+r.loc);
// race on product 2
const o=codes.filter(x=>x.productId!==codes[0].productId); const p1=o.filter(x=>x.productId===o[0].productId);
const res=await Promise.all(Array.from({length:8},()=>act(p1[0],c[0].cookie)));log('race 8 concurrent',JSON.stringify(res.map(x=>x.s).sort()));
r=await call('/api/customer/products?workspaceId='+c[0].ws,{cookie:c[0].cookie});log('products list',r.s+' '+JSON.stringify((r.j?.products||[]).map(p=>p.status)));
r=await call('/api/admin/batches',{method:'POST',cookie:A,body:{workspaceId:c[0].ws,productTypeId:pt,batchCode:'B1',quantity:1,initialDestinationUrl:'https://e.com'}});log('dup batch (expect 409)',r.s);
r=await call('/api/admin/customers',{cookie:c[0].cookie});log('customer->admin customers (403)',r.s);
r=await call('/api/admin/product-types',{cookie:c[0].cookie});log('customer->admin product-types GET (403)',r.s);
r=await call('/api/admin/batches',{method:'POST',cookie:c[1].cookie,body:{workspaceId:c[0].ws,productTypeId:pt,batchCode:'B9',quantity:1,initialDestinationUrl:'https://x.com'}});log('customer->admin batches (403)',r.s);
let st=[];for(let i=0;i<13;i++){st.push((await call('/api/auth/login',{method:'POST',body:{email:'cust-a@test.local',password:'bad-pw-attempt-'+i}})).s);}log('13 bad logins',st.join(','));
r=await call('/api/auth/login',{method:'POST',body:{email:'cust-a@test.local',password:'Customer-Pass-a-1234'}});log('correct login after lockout',r.s);
console.log(out.join('\n'));
