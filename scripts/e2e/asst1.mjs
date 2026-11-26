// Built-in help guide API: auth, validation, grounded answers, honest fallback, exact per-user ceiling.
const B=process.env.E2E_BASE_URL;let bad=0;const chk=(n,ok,d='')=>{console.log((ok?'PASS ':'FAIL ')+n+(d?' '+d:''));if(!ok)bad=1;};
async function call(path,{method='GET',body,cookie,ip}={}){const r=await fetch(B+path,{method,headers:{...(body?{'content-type':'application/json'}:{}),...(cookie?{cookie}:{}),...(ip?{'x-forwarded-for':ip}:{})},body:body?JSON.stringify(body):undefined});let j=null;try{j=await r.json()}catch{}return{s:r.status,j,cookie:(r.headers.get('set-cookie')||'').split(';')[0]}}
const A=(await call('/api/auth/login',{method:'POST',body:{email:'admin@test.local',password:'Admin-Test-Pass-123'}})).cookie;
const c=await call('/api/admin/customers',{method:'POST',cookie:A,body:{email:'as@gmail.com',workspaceName:'As co',workspaceSlug:'as-co'}});
await call('/api/auth/accept-invitation',{method:'POST',body:{token:new URL(c.j.invitation.url).searchParams.get('token'),password:'Asst-Test-Pass-1234'}});
const cust=(await call('/api/auth/login',{method:'POST',body:{email:'as@gmail.com',password:'Asst-Test-Pass-1234'},ip:'10.5.0.1'})).cookie;
const ask=(question,lang,ck)=>call('/api/customer/assistant',{method:'POST',cookie:ck===null?undefined:cust,body:{question,lang}});
chk('anonymous gets 401',(await ask('x','ar',null)).s===401);
chk('empty and over-long questions get 400',(await ask('   ','ar')).s===400&&(await ask('a'.repeat(301),'ar')).s===400);
const p=await ask('ازاي انشر المنيو؟','ar');chk('Arabic publish question answered from the guide, section menus',p.s===200&&p.j.matched&&p.j.section==='menus'&&/نشر/.test(p.j.text)&&p.j.source==='built-in guide');
const ph=await ask('Can I upload a photo?','en');chk('English photo question says upload is not available',ph.j.matched&&/not available yet/.test(ph.j.text));
const pay=await ask('can customers pay online','en');chk('payment question says online payment is not available',pay.j.matched&&/not available/.test(pay.j.text));
const un=await ask('what is the weather in Cairo','en');chk('unknown question gets the honest fallback, not an invented answer',un.s===200&&!un.j.matched&&un.j.section===null);
const pr=await ask('what is my plan price','en');chk('plan answer contains no digits (no invented prices or limits)',!/\d/.test(pr.j.text));
const par=await Promise.all(Array.from({length:70},()=>ask('menu','en')));
const n429=par.filter(r=>r.s===429).length;
chk('per-user ceiling: exactly 60 questions per hour admitted in total (earlier calls counted)',n429===70-(60-5),'429s '+n429+' (5 counted earlier)');
console.log(bad?'FAILED':'DONE');process.exit(bad);
