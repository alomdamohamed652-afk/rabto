// Plans and entitlements, end to end against the isolated test DB (TEST ONLY).
const B=process.env.E2E_BASE_URL||'http://127.0.0.1:3111'; const out=[]; let bad=0;
const chk=(k,ok,extra='')=>{out.push((ok?'PASS ':'FAIL ')+k+(extra?' '+extra:''));if(!ok)bad++;};
async function call(path,{method='GET',body,cookie}={}){const r=await fetch(B+path,{method,headers:{...(body?{'content-type':'application/json'}:{}),...(cookie?{cookie}:{})},body:body?JSON.stringify(body):undefined});let j=null;try{j=await r.json()}catch{};const sc=r.headers.get('set-cookie');return {s:r.status,j,cookie:sc?sc.split(';')[0]:null};}
let r=await call('/api/auth/login',{method:'POST',body:{email:'admin@test.local',password:'Admin-Test-Pass-123'}});const A=r.cookie;
const mkCust=async(n,planId)=>{const x=await call('/api/admin/customers',{method:'POST',cookie:A,body:{email:`pl-${n}@test.local`,workspaceName:'Pl '+n,workspaceSlug:'pl-'+n,planId}});if(x.s!==201)return {x};const tok=new URL(x.j.invitation.url).searchParams.get('token');const acc=await call('/api/auth/accept-invitation',{method:'POST',body:{token:tok,password:'Customer-Pass-'+n+'-1234'}});return {x,cookie:acc.cookie,ws:x.j.customer.workspace.id};};
// plans start empty and need admin
r=await call('/api/admin/plans',{cookie:A});chk('plans start empty',r.s===200&&r.j.plans.length===0);
chk('plans need admin',(await call('/api/admin/plans')).s===401);
const free=await mkCust('free');chk('customer without plan',free.x.s===201);
chk('customer plan route (none)',(await call('/api/customer/plan?workspaceId='+free.ws,{cookie:free.cookie})).j?.status==='none');
chk('customer cannot read admin plans',(await call('/api/admin/plans',{cookie:free.cookie})).s===403);
chk('validation rejects negative limit',(await call('/api/admin/plans',{method:'POST',cookie:A,body:{name:'Bad',maxPages:-1}})).s===400);
r=await call('/api/admin/plans',{method:'POST',cookie:A,body:{name:'Small',description:'d',maxActivatedProducts:1,maxPages:1,analyticsEnabled:false}});chk('create plan',r.s===201);const small=r.j.id;
chk('duplicate name 409',(await call('/api/admin/plans',{method:'POST',cookie:A,body:{name:'Small'}})).s===409);
r=await call('/api/admin/plans',{method:'POST',cookie:A,body:{name:'Open'}});const open=r.j.id;
r=await call('/api/admin/plans',{method:'POST',cookie:A,body:{name:'Retired',isActive:false}});const retired=r.j.id;
const bad1=await mkCust('badplan',retired);chk('inactive plan rejected at customer creation',bad1.x.s===409);
const miss=await call('/api/admin/customers',{method:'POST',cookie:A,body:{email:'pl-miss@test.local',workspaceName:'Pl miss',workspaceSlug:'pl-miss',planId:'123e4567-e89b-42d3-a456-426614174000'}});chk('unknown plan rejected before creating customer',miss.s===404);
const c=await mkCust('small',small);chk('customer created with plan',c.x.s===201);
r=await call('/api/customer/plan?workspaceId='+c.ws,{cookie:c.cookie});chk('customer sees plan',r.j?.status==='active'&&r.j.plan.name==='Small'&&r.j.plan.maxPages===1&&r.j.plan.analyticsEnabled===false);
const other=await mkCust('other',open);
chk('other tenant cannot read this plan',(await call('/api/customer/plan?workspaceId='+c.ws,{cookie:other.cookie})).s===403);
// enforcement: pages
const pg=(slug,pageId)=>call('/api/customer/pages',{method:'POST',cookie:c.cookie,body:{workspaceId:c.ws,pageId,slug,title:'T '+slug,content:{blocks:[{type:'heading',text:'Hi'}]}}});
r=await pg('one');chk('page 1 allowed',r.s===201);const p1=r.j.pageId;
chk('page 2 blocked by plan',(await pg('two')).s===403);
chk('editing page 1 still allowed at limit',(await pg('one',p1)).s===200);
// analytics gate
r=await call('/api/customer/analytics?workspaceId='+c.ws+'&days=30',{cookie:c.cookie});chk('analytics blocked by plan',r.s===403&&r.j.code==='plan_feature');
chk('analytics open on unrestricted plan',(await call('/api/customer/analytics?workspaceId='+other.ws+'&days=30',{cookie:other.cookie})).s===200);
chk('analytics open with no plan',(await call('/api/customer/analytics?workspaceId='+free.ws+'&days=30',{cookie:free.cookie})).s===200);
// enforcement: activation
r=await call('/api/admin/product-types',{method:'POST',cookie:A,body:{workspaceId:c.ws,name:'Tag',skuPrefix:'PLN'}});const pt=r.j.productType.id;
r=await call('/api/admin/batches',{method:'POST',cookie:A,body:{workspaceId:c.ws,productTypeId:pt,batchCode:'P1',quantity:2,initialDestinationUrl:'https://example.com/x'}});
const qrs=r.j.codes.filter(x=>x.channel==='qr');
const act=(code)=>call('/api/customer/activate',{method:'POST',cookie:c.cookie,body:{workspaceId:c.ws,publicCode:code.publicCode,activationSecret:code.activationSecret}});
chk('batch of 2 created',r.s===201&&qrs.length>=1,'qr codes '+qrs.length);
const a1=await act(qrs[0]);chk('activation 1 allowed',a1.s===200);
const a2=await act(qrs[1]||qrs[0]);chk('activation 2 blocked by plan (or already activated)',a2.s===403||(!qrs[1]&&a2.s===409),String(a2.s));
// resolver still works after limit
const res=await fetch(B+'/d/'+qrs[0].publicCode,{redirect:'manual'});chk('existing product still resolves',res.status>=300&&res.status<400||res.status===200,String(res.status));
// admin change: raise limit by switching plan, audit logged
r=await call('/api/admin/subscriptions',{method:'PUT',cookie:A,body:{workspaceId:c.ws,planId:open,status:'active'}});chk('admin changes plan',r.s===200);
chk('page 2 allowed after upgrade',(await pg('two')).s===201);
chk('analytics allowed after upgrade',(await call('/api/customer/analytics?workspaceId='+c.ws+'&days=30',{cookie:c.cookie})).s===200);
r=await call('/api/admin/subscriptions',{method:'PUT',cookie:A,body:{workspaceId:c.ws,planId:small,status:'expired'}});chk('admin downgrades + marks expired',r.s===200);
r=await call('/api/customer/plan?workspaceId='+c.ws,{cookie:c.cookie});chk('customer sees expired status',r.j?.status==='expired');
chk('downgraded workspace cannot add a third page',(await pg('three')).s===403);
chk('resolver unaffected by downgrade',(await fetch(B+'/d/'+qrs[0].publicCode,{redirect:'manual'})).status<500);
chk('non-admin cannot assign',(await call('/api/admin/subscriptions',{method:'PUT',cookie:c.cookie,body:{workspaceId:c.ws,planId:open}})).s===403);
chk('assign inactive plan rejected',(await call('/api/admin/subscriptions',{method:'PUT',cookie:A,body:{workspaceId:c.ws,planId:retired}})).s===409);
console.log(out.join('\n'));process.exit(bad?1:0);
