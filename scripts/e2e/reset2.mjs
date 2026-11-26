// Production build with the sink variable SET must still refuse to send or create codes (sink denied in production).
import { execFileSync } from 'node:child_process';
const B=process.env.E2E_BASE_URL;const q=(s)=>execFileSync('psql',['-d','rabto_e2e','-Atc',s],{encoding:'utf8'}).trim();
const r=await fetch(B+'/api/auth/password-reset/request',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:'admin@test.local'})});const j=await r.json();
const ok=r.status===503&&j.code==='mail_unavailable'&&q('select count(*) from password_reset_codes')==='0';
console.log((ok?'PASS':'FAIL')+' production build, sink variable set: explicit not-active state, no code created ('+r.status+')');process.exit(ok?0:1);
