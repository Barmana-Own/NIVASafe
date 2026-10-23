import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

export const root = 'C:/NIVASafe';
export const task = 'rula-landmark-accuracy-20261022-01';
export const id = `release-${task}`;
export const evidence = `${root}/reports/evidence/${task}`;
export const candidate = `${root}/.local/${task}/candidate`;
export const live = 'C:/inetpub/nivasafe/app-com';
export const config = `${root}/deployment/ecosystem.config.cjs`;
export const python = 'C:/ProgramData/NIVASafe/runtimes/rula-pose-20261022/python.exe';
export const model = 'C:/ProgramData/NIVASafe/models/rula-pose-20261022/pose_landmarker_full.task';
export const modelSha256 = '5134a3aad27a58b93da0088d431f366da362b44e3ccfbe3462b3827a839011b1';
export const sha = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
export const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
export const same = (a,b) => path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase();
export function powershell(command) {
  const env={...process.env}; delete env.PSModulePath;
  const r = spawnSync('powershell.exe', ['-NoProfile','-Command',`$ErrorActionPreference='Stop'; ${command}`], { encoding:'utf8', windowsHide:true,env });
  assert.equal(r.status, 0, 'Runtime prerequisite check failed');
  return JSON.parse(r.stdout.replace(/^\uFEFF/u, ''));
}
export function verifyLocalRuntime() {
  assert.equal(sha(model),modelSha256,'Local pose model hash mismatch');
  const state = powershell(`$taskRule = Get-NetFirewallRule -Name 'NIVASafe-RULA-Pose-Offline-20261022' -ErrorAction Stop; $taskFilter = $taskRule | Get-NetFirewallApplicationFilter; $taskRuntimeAcl = Get-Acl -LiteralPath '${path.dirname(python)}'; $taskModelAcl = Get-Acl -LiteralPath '${path.dirname(model)}'; [pscustomobject]@{ FirewallEnabled=[bool]($taskRule.Enabled -eq 'True'); Outbound=[bool]($taskRule.Direction -eq 'Outbound'); Block=[bool]($taskRule.Action -eq 'Block'); Profile=[string]$taskRule.Profile; Program=$taskFilter.Program; AllProfilesEnabled=[bool](@(Get-NetFirewallProfile | Where-Object { -not $_.Enabled }).Count -eq 0); RuntimeProtected=$taskRuntimeAcl.AreAccessRulesProtected; ModelProtected=$taskModelAcl.AreAccessRulesProtected; RuntimeSids=@($taskRuntimeAcl.Access | ForEach-Object {$_.IdentityReference.Translate([System.Security.Principal.SecurityIdentifier]).Value}); ModelSids=@($taskModelAcl.Access | ForEach-Object {$_.IdentityReference.Translate([System.Security.Principal.SecurityIdentifier]).Value}) } | ConvertTo-Json -Compress`);
  assert(state.FirewallEnabled && state.Outbound && state.Block && state.Profile==='Any' && state.AllProfilesEnabled && same(state.Program,python));
  assert(state.RuntimeProtected && state.ModelProtected);
  for(const entries of [state.RuntimeSids,state.ModelSids]) assert(entries.length===2 && entries.every(s=>['S-1-5-18','S-1-5-32-544'].includes(s)), 'Private artifact ACL is too broad');
  const check=spawnSync(python,['-I','-m','pip','check'],{encoding:'utf8',windowsHide:true});
  assert.equal(check.status,0,'Local Python dependencies invalid');
  const blocked=spawnSync(python,['-I','-c', 'import socket,json,time\ns=socket.socket();s.settimeout(3);t=time.monotonic()\ntry:\n s.connect(("1.1.1.1",443)); print(json.dumps({"blocked":False}))\nexcept OSError as e:\n print(json.dumps({"blocked":e.errno==13,"errno":e.errno,"seconds":time.monotonic()-t}))\nfinally:\n s.close()'],{encoding:'utf8',windowsHide:true});
  assert.equal(blocked.status,0);
  const network=JSON.parse(blocked.stdout); assert(network.blocked,'Dedicated pose runtime must have no outbound access');
  return {status:'PASS', python, model,modelSha256,firewall:state,network,dependencies:check.stdout.trim()};
}

if (process.argv.includes('--capture')) {
  fs.mkdirSync(evidence,{recursive:true});
  const require=createRequire(import.meta.url); process.env.PM2_HOME='C:/ProgramData/NIVASafe/pm2';
  const pm2=require('C:/Runtime/node/node_modules/pm2');
  const call=(method,...args)=>new Promise((resolve,reject)=>pm2[method](...args,(error,result)=>error?reject(error):resolve(result)));
  try {
    await call('connect');
    const api=(await call('list')).find(a=>a.name==='nivasafe-api');
    assert(api?.pid && api.pm2_env.APP_VERSION==='release-assessment-image-activation-20261022-01');
    const processInfo=powershell(`$taskProcess=Get-CimInstance Win32_Process -Filter 'ProcessId = ${Number(api.pid)}'; [pscustomobject]@{pid=$taskProcess.ProcessId;commandLine=$taskProcess.CommandLine;listeners=@(Get-NetTCPConnection -State Listen -LocalPort 5044 | Select-Object -ExpandProperty OwningProcess -Unique)} | ConvertTo-Json -Compress`);
    assert(processInfo.commandLine.replaceAll('\\','/').includes(api.pm2_env.pm_exec_path.replaceAll('\\','/')));
    assert.deepEqual(processInfo.listeners,[api.pid]);
    const snapshot={status:'VERIFIED',pid:api.pid,entry:api.pm2_env.pm_exec_path,version:api.pm2_env.APP_VERSION,processInfo,configSha256:sha(config),envSha256:sha(`${root}/.env`),indexSha256:sha(`${live}/index.html`)};
    if(fs.existsSync(`${evidence}/runtime-before.json`)) assert.deepEqual(read(`${evidence}/runtime-before.json`),snapshot,'Runtime changed since baseline');
    else fs.writeFileSync(`${evidence}/runtime-before.json`,JSON.stringify(snapshot,null,2));
    fs.writeFileSync(`${evidence}/local-runtime.json`,JSON.stringify(verifyLocalRuntime(),null,2));
    console.log(JSON.stringify({status:'PASS',pid:api.pid,localRuntimeOffline:true,environmentUnchanged:true}));
  } finally {pm2.disconnect();}
}
