import {PrismaClient,Prisma} from '../backend/node_modules/@prisma/client/default.js';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const p=new PrismaClient();const hash=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
try{
 const users=await p.user.count();const millionLimitUsers=await p.user.count({where:{aiTokenLimit:1000000}});assert.equal(users,millionLimitUsers);
 assert.equal(Prisma.dmmf.datamodel.models.find(x=>x.name==='User').fields.find(x=>x.name==='aiTokenLimit').default,1000000);
 assert.equal(hash('backend/dist/ai-access.js'),hash('C:/NIVASafe/backend/dist/ai-access.js'));
 assert.equal(hash('C:/NIVASafe/backups/release-ai-access-million-20261010/backend-dist/ai-provider.js'),hash('C:/NIVASafe/backend/dist/ai-provider.js'));
 const urls=['http://127.0.0.1:5044/api/v1/health','https://app.nivasafe.com/api/v1/health','https://app.nivasafe.com/login'];for(const url of urls){const r=await fetch(url);assert.equal(r.status,200)}
 const denied=await fetch('http://127.0.0.1:5044/api/v1/admin/users/00000000-0000-4000-8000-000000000001/ai-access',{method:'PATCH',headers:{'Content-Type':'application/json'},body:'{"aiEnabled":false}'});assert.equal(denied.status,401);
 const html=readFileSync('C:/inetpub/nivasafe/app-com/index.html','utf8');const assets=html.match(/\/assets\/[^"']+\.(?:js|css)/g);for(const asset of assets){const r=await fetch('https://app.nivasafe.com'+asset);assert.equal(r.status,200);assert.equal(createHash('sha256').update(Buffer.from(await r.arrayBuffer())).digest('hex'),hash('C:/inetpub/nivasafe/app-com'+asset));}
 const evidence={users,millionLimitUsers,generatedClientDefault:1000000,liveAllowanceBuild:'PASS',existingProviderPreserved:'PASS',healthAndAssets:'PASS',unauthenticatedAdminMutation:401};writeFileSync('scripts/million-quota-live-evidence.json',JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence));
}finally{await p.$disconnect()}
