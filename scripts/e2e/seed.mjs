import { randomBytes, scryptSync } from 'node:crypto';
export function hash(pw){const salt=randomBytes(16);const d=scryptSync(pw,salt,64,{N:16384,r:8,p:1,maxmem:64*1024*1024});return `scrypt$16384$8$1$${salt.toString('base64url')}$${d.toString('base64url')}`;}
