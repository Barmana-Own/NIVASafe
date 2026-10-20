import {PrismaClient} from '../backend/node_modules/@prisma/client/default.js';
import assert from 'node:assert/strict';import{readFileSync,writeFileSync}from'node:fs';import{createHash}from'node:crypto';
const p=new PrismaClient();const hash=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
try{
 const primary=await p.user.findUnique({where:{email:'admin@app.nivasafe.com'},select:{protectedSystemAdmin:true,globalRole:true,active:true}});assert.ok(primary?.protectedSystemAdmin);assert.equal(primary.globalRole,'SUPER_ADMIN');assert.equal(primary.active,true);assert.equal(await p.user.count({where:{protectedSystemAdmin:true}}),1);
 for(const file of ['modules/admin.js','modules/users.js','protected-system-admin.js'])assert.equal(hash('backend/dist/'+file),hash('C:/NIVASafe/backend/dist/'+file));
 for(const url of ['http://127.0.0.1:5044/api/v1/health','https://app.nivasafe.com/api/v1/health','https://app.nivasafe.com/login'])assert.equal((await fetch(url)).status,200);
 const denied=await fetch('http://127.0.0.1:5044/api/v1/admin/users/00000000-0000-4000-8000-000000000001/ai-access',{method:'PATCH',headers:{'Content-Type':'application/json'},body:'{"aiTokenLimit":1000000}'});assert.equal(denied.status,401);
 const html=readFileSync('C:/inetpub/nivasafe/app-com/index.html','utf8');for(const asset of html.match(/\/assets\/[^"']+\.(?:js|css)/g)){const r=await fetch('https://app.nivasafe.com'+asset);assert.equal(r.status,200);assert.equal(createHash('sha256').update(Buffer.from(await r.arrayBuffer())).digest('hex'),hash('C:/inetpub/nivasafe/app-com'+asset));}
 const evidence={protectedAdmin:true,protectedAccounts:1,role:'SUPER_ADMIN',active:true,liveBuildsMatch:true,healthAndAssets:'PASS',unauthenticatedQuotaChange:401};writeFileSync('scripts/admin-controls-live-evidence.json',JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence));
}finally{await p.$disconnect()}
