const B=process.env.E2E_BASE_URL||'http://127.0.0.1:3111'; const out=[]; const log=(k,v)=>out.push(k+': '+v);
async function login(email,password,xff){const r=await fetch(B+'/api/auth/login',{method:'POST',headers:{'content-type':'application/json',...(xff?{'x-forwarded-for':xff}:{})},body:JSON.stringify({email,password})});return r.status;}
const A=['admin@test.local','Admin-Test-Pass-123'];
const mode=process.env.MODE;
// attacker at 9.9.9.9 (real client ip appended by proxy), spoofing leftmost XFF values
let st=[];for(let i=0;i<12;i++)st.push(await login(A[0],'bad'+i,`1.1.1.${i}, 9.9.9.9`));log(mode+' attacker 12 bad (rotating spoofed leftmost XFF)',st.join(','));
log(mode+' victim correct login from other IP 8.8.8.8',await login(...A,'8.8.8.8'));
log(mode+' victim correct login from attacker IP 9.9.9.9',await login(...A,'7.7.7.7, 9.9.9.9'));
log(mode+' victim no XFF',await login(...A,null));
const cs=await Promise.all(Array.from({length:40},(_,i)=>login(A[0],'conc'+i,null)));log(mode+' 40 concurrent bad, no ip',JSON.stringify(cs.reduce((a,s)=>(a[s]=(a[s]||0)+1,a),{})));log(mode+' known IP 8.8.8.8 after unknown-ip flood',await login(...A,'8.8.8.8'));log(mode+' no-ip correct login after flood',await login(...A,null));
console.log(out.join('\n'));
