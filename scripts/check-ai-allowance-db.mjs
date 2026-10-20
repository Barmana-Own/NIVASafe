import { PrismaClient } from '../backend/node_modules/@prisma/client/default.js';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,unlinkSync} from 'node:fs';
const database='nivasafe_ai_allowance_fixture';
const liveUrl=new URL(process.env.DATABASE_URL);
const fixtureUrl=new URL(liveUrl);fixtureUrl.pathname='/'+database;
const account=decodeURIComponent(liveUrl.username);
if(!/^[a-zA-Z0-9_]+$/.test(account))throw Error('Unsupported fixture account');
function sql(query){const r=spawnSync('C:/Runtime/mariadb/bin/mysql.exe',['-u',process.env.XAMPP_MYSQL_USER??'root','-N','-e',query],{env:{...process.env,MYSQL_PWD:process.env.XAMPP_MYSQL_PASSWORD??''},encoding:'utf8'});if(r.status!==0)throw Error('Fixture SQL failed: '+r.stderr);return r.stdout.trim();}
let created=false;
try {
  if(sql("SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME='nivasafe_ai_allowance_fixture'"))throw Error('Fixture database already exists; refusing to replace');
  sql("CREATE DATABASE `nivasafe_ai_allowance_fixture` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");created=true;
  sql(`GRANT ALL ON nivasafe_ai_allowance_fixture.* TO '${account}'@'localhost'`);  const schemaFile='backend/prisma/ai-allowance-baseline.fixture.prisma';
  let schema=readFileSync('backend/prisma/schema.prisma','utf8').split('model AIQuotaReservation')[0];
  schema=schema.replace(/^\s*protectedSystemAdmin.*$/gm,'');
  schema=schema.replace(/^\s*ai(?:Enabled|TokenLimit|TokensUsed|QuotaReservations).*$/gm,'');
  writeFileSync(schemaFile,schema);
  try {
    const setup=spawnSync(process.execPath,['backend/node_modules/prisma/build/index.js','db','push','--skip-generate','--schema',schemaFile],{env:{...process.env,DATABASE_URL:fixtureUrl.href},encoding:'utf8'});
    if(setup.status!==0)throw Error('Baseline schema setup failed: '+setup.stdout+setup.stderr);
  } finally { unlinkSync(schemaFile); }
  sql('USE `nivasafe_ai_allowance_fixture`;'+readFileSync('backend/prisma/migrations/202610100001_ai_user_allowance/migration.sql','utf8').replace(/^\uFEFF/,''));  sql("USE nivasafe_ai_allowance_fixture; INSERT INTO User (id,email,displayName,passwordHash,aiTokensUsed,aiEnabled,aiTokenLimit,updatedAt) VALUES ('quota-upgrade','quota-upgrade@example.invalid','Upgrade','not-a-password',123456,false,100000,NOW()),('quota-custom','quota-custom@example.invalid','Custom','not-a-password',120,false,200000,NOW())");
  sql('USE nivasafe_ai_allowance_fixture;'+readFileSync('backend/prisma/migrations/202610100002_ai_million_token_allowance/migration.sql','utf8'));
  assert.equal(sql("SELECT CONCAT(aiTokenLimit,':',aiTokensUsed,':',aiEnabled) FROM nivasafe_ai_allowance_fixture.User WHERE id='quota-upgrade'"),'1000000:123456:0');
  assert.equal(sql("SELECT CONCAT(aiTokenLimit,':',aiTokensUsed,':',aiEnabled) FROM nivasafe_ai_allowance_fixture.User WHERE id='quota-custom'"),'200000:120:0');
  sql("USE nivasafe_ai_allowance_fixture; INSERT INTO User (id,email,displayName,passwordHash,globalRole,updatedAt) VALUES ('protected-admin','admin@app.nivasafe.com','NIVASafe Administrator','not-a-password','SUPER_ADMIN',NOW())");
  sql('USE nivasafe_ai_allowance_fixture;'+readFileSync('backend/prisma/migrations/202610100003_protected_system_admin/migration.sql','utf8'));
  assert.equal(sql("SELECT protectedSystemAdmin FROM nivasafe_ai_allowance_fixture.User WHERE id='protected-admin'"),'1');
  assert.equal(sql("SELECT protectedSystemAdmin FROM nivasafe_ai_allowance_fixture.User WHERE id='quota-custom'"),'0');
  process.env.DATABASE_URL=fixtureUrl.href;
  const {prisma}=await import('../backend/dist/core.js');
  const {withAIAllowance}=await import('../backend/dist/ai-access.js');
  try {
    const user=await prisma.user.create({data:{email:'fixture@example.invalid',displayName:'Fixture',passwordHash:'not-a-password'}});
    assert.equal(user.aiEnabled,true);assert.equal(user.aiTokenLimit,1000000);
    const input={userId:user.id,organizationId:'fixture',message:'test',includeKnowledge:false,maxOutputTokens:128};
    let release;const gate=new Promise(r=>{release=r});
    await prisma.user.update({where:{id:user.id},data:{aiTokenLimit:1000}});
    const result={provider:'fixture',answer:'ok',citations:[],confidence:1,usage:{totalTokens:50,inputTokens:20,outputTokens:30}};
    const first=withAIAllowance(input,async()=>{await gate;return result});
    while(!await prisma.aIQuotaReservation.count())await new Promise(r=>setTimeout(r,10));
    await assert.rejects(withAIAllowance(input,async()=>result),{code:'AI_ACCESS_LIMIT_REACHED'});
    release();await first;
    const charged=await prisma.user.findUnique({where:{id:user.id}});assert.equal(charged.aiTokensUsed,50);
    assert.equal(await prisma.aIQuotaReservation.count(),0);
    await prisma.user.update({where:{id:user.id},data:{aiEnabled:false}});
    await assert.rejects(withAIAllowance(input,async()=>result),{code:'AI_ACCESS_DISABLED'});
    console.log('PASS additive MySQL migration against current schema baseline, default enabled/1000000; upgraded usage/access and custom quotas preserved, real concurrent row locks, charging, release and disabled user');
  } finally { await prisma.$disconnect(); }
} finally { if(created){sql('DROP DATABASE `nivasafe_ai_allowance_fixture`');sql(`REVOKE ALL PRIVILEGES ON nivasafe_ai_allowance_fixture.* FROM '${account}'@'localhost'`);} }