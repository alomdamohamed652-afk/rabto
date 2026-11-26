// Photo upload API. Run once without a driver (expects honest 503) and once with RABTO_STORAGE_DRIVER=mock (E2E_MODE=mock).
const B=process.env.E2E_BASE_URL;const MOCK=process.env.E2E_MODE==='mock';let bad=0;const chk=(n,ok,d='')=>{console.log((ok?'PASS ':'FAIL ')+n+(d?' '+d:''));if(!ok)bad=1;};
async function call(path,{method='GET',body,cookie,raw,ip}={}){const h={...(cookie?{cookie}:{}),...(ip?{'x-forwarded-for':ip}:{})};if(body)h['content-type']='application/json';if(raw)h['content-type']='application/octet-stream';const r=await fetch(B+path,{method,headers:h,body:raw||(body?JSON.stringify(body):undefined)});let j=null;try{j=await r.json()}catch{}return{s:r.status,j,cookie:(r.headers.get('set-cookie')||'').split(';')[0]}}
const A=(await call('/api/auth/login',{method:'POST',body:{email:'admin@test.local',password:'Admin-Test-Pass-123'}})).cookie;
async function mk(email,slug){const c=await call('/api/admin/customers',{method:'POST',cookie:A,body:{email,workspaceName:slug,workspaceSlug:slug}});const acc=await call('/api/auth/accept-invitation',{method:'POST',body:{token:new URL(c.j.invitation.url).searchParams.get('token'),password:'Up1-Test-Pass-12345'}});return{ck:acc.cookie,ws:c.j.customer.workspace.id};}
const u1=await mk('up1a@gmail.com','up-a'),u2=await mk('up1b@gmail.com','up-b');
const png=Buffer.concat([Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0,0,0,13,0x49,0x48,0x44,0x52]),Buffer.alloc(17,1),Buffer.alloc(200,1),Buffer.from([0,0,0,0,0x49,0x45,0x4e,0x44,0xae,0x42,0x60,0x82])]);
const jpg=Buffer.concat([Buffer.from([0xff,0xd8,0xff,0xe0]),Buffer.alloc(200,2),Buffer.from([0xff,0xd9])]);
const webpBody=Buffer.concat([Buffer.from('WEBP'),Buffer.alloc(200,3)]);const sz=Buffer.alloc(4);sz.writeUInt32LE(webpBody.length);const webp=Buffer.concat([Buffer.from('RIFF'),sz,webpBody]);
const up=(ck,ws,raw)=>call('/api/customer/uploads?workspaceId='+ws,{method:'POST',cookie:ck,raw});
chk('anonymous 401',(await call('/api/customer/uploads?workspaceId='+u1.ws,{method:'POST',raw:png})).s===401);
chk('missing workspaceId 400',(await call('/api/customer/uploads',{method:'POST',cookie:u1.ck,raw:png})).s===400);
chk('non-member 403 (workspace scoping)',(await up(u2.ck,u1.ws,png)).s===403);
if(!MOCK){const r=await up(u1.ck,u1.ws,png);chk('no provider configured: honest 503 storage_not_configured',r.s===503&&r.j.code==='storage_not_configured');}
else{
 const a=await up(u1.ck,u1.ws,png),b=await up(u1.ck,u1.ws,jpg),c=await up(u1.ck,u1.ws,webp);
 chk('png, jpeg, webp accepted with https url scoped to the workspace',[a,b,c].every(x=>x.s===201&&x.j.url.startsWith('https://')&&x.j.url.includes('/'+u1.ws+'/')),JSON.stringify([a.j.url.slice(-8),b.j.url.slice(-8),c.j.url.slice(-9)]));
 chk('stored extensions come from the bytes',a.j.url.endsWith('.png')&&b.j.url.endsWith('.jpg')&&c.j.url.endsWith('.webp'));
 chk('names are server generated and unique',a.j.url!==(await up(u1.ck,u1.ws,png)).j.url);
 chk('html disguised as an image rejected 400 bad_type',(await up(u1.ck,u1.ws,Buffer.from('<html><script>alert(1)</script>'.padEnd(200,' ')))).j?.code==='bad_type');
 chk('svg rejected',(await up(u1.ck,u1.ws,Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'.padEnd(200,' ')))).s===400);
 chk('png signature + random bytes rejected (structure check)',(await up(u1.ck,u1.ws,Buffer.concat([png.subarray(0,8),Buffer.alloc(300,7)]))).j?.code==='bad_type');
 chk('jpeg signature without end marker rejected',(await up(u1.ck,u1.ws,Buffer.concat([Buffer.from([0xff,0xd8,0xff,0xe0]),Buffer.alloc(300,5)]))).j?.code==='bad_type');
 chk('webp with wrong RIFF size rejected',(await up(u1.ck,u1.ws,Buffer.concat([webp,Buffer.alloc(40,3)]))).j?.code==='bad_type');
 {const chunk=Buffer.alloc(256*1024,1);let sent=0;const stream=new ReadableStream({pull(c){if(sent>=12){c.close();return}sent++;c.enqueue(new Uint8Array(chunk))}});const rr=await fetch(B+'/api/customer/uploads?workspaceId='+u1.ws,{method:'POST',headers:{cookie:u1.ck,'content-type':'application/octet-stream'},body:stream,duplex:'half'});chk('3 MB streamed with no Content-Length rejected 413 while reading',rr.status===413,String(rr.status));}
 chk('tiny file rejected as empty',(await up(u1.ck,u1.ws,Buffer.from([0x89,0x50]))).j?.code==='empty');
 const big=Buffer.concat([png,Buffer.alloc(2*1024*1024,1)]);let r;try{r=await up(u1.ck,u1.ws,big)}catch(e){r={s:/ECONNRESET|fetch failed/.test(String(e)+String(e.cause))?413:0}}chk('over 2 MB rejected 413 (a reset after the early 413 counts: server refused without reading the body)',r.s===413);
 const par=await Promise.all(Array.from({length:40},()=>up(u1.ck,u1.ws,png)));const n=par.filter(x=>x.s===429).length;chk('per-user hourly ceiling of 30 exact (4 earlier valid uploads counted)',n===40-(30-4),'429s '+n);
}
console.log(bad?'FAILED':'DONE');process.exit(bad);
