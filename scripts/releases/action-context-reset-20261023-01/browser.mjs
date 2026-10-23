import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {root,task,work,candidate,evidence,live,sha,read,frozen} from './prepare.mjs';
frozen();const plan=read(`${evidence}/frontend-plan.json`),index=fs.readFileSync(`${work}/test-index.html`);assert.equal(sha(`${work}/test-index.html`),plan.htmlSha256);assert(!fs.existsSync(`${evidence}/e2e-validation.json`));
const planned=new Map(plan.assets.map(asset=>[asset.url,asset.sha256])),candidateRoot=path.resolve(candidate,'frontend/dist'),liveRoot=path.resolve(live),staticInputs=new Map(),candidateInputs=new Map();
const mime={'.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2','.ico':'image/x-icon'};
const server=http.createServer((request,response)=>{try{assert.equal(request.method,'GET');const url=new URL(request.url,'http://127.0.0.1');const decoded=decodeURIComponent(url.pathname);assert(!decoded.includes('\\')&&!decoded.includes('\0'));response.setHeader('cache-control','no-store');const built=path.resolve(candidateRoot,`.${decoded}`),prior=path.resolve(liveRoot,`.${decoded}`);assert(built.startsWith(candidateRoot+path.sep)&&prior.startsWith(liveRoot+path.sep));let file;
 if(planned.has(decoded)){file=built;assert.equal(sha(file),planned.get(decoded));candidateInputs.set(path.relative(candidateRoot,file).replaceAll('\\','/'),sha(file));}
 else if(fs.existsSync(prior)&&fs.statSync(prior).isFile()){file=prior;staticInputs.set(path.relative(liveRoot,file).replaceAll('\\','/'),sha(file));}
 if(file){response.setHeader('content-type',mime[path.extname(file)]??'application/octet-stream');response.end(fs.readFileSync(file));return;}
 assert(!path.extname(decoded));response.setHeader('content-type','text/html;charset=utf-8');response.end(index);
}catch{response.statusCode=404;response.end('Not found');}});
let result={task,status:'FAIL',candidateManifestSha256:sha(`${evidence}/candidate.json`),helperSha256:sha(fileURLToPath(import.meta.url)),hybridIndexSha256:plan.htmlSha256,frontendPlanSha256:sha(`${evidence}/frontend-plan.json`),productionMutations:0};
try{
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});const origin=`http://127.0.0.1:${server.address().port}`;
 const configuration={testDir:`${candidate}/frontend/tests/e2e`,testMatch:'actions-create-reset.spec.ts',fullyParallel:false,forbidOnly:true,retries:0,workers:2,timeout:45000,expect:{timeout:10000},reporter:[['json',{outputFile:`${evidence}/playwright-result.json`}]],outputDir:`${evidence}/playwright-artifacts`,use:{baseURL:origin,channel:'chrome',headless:true,locale:'en-US',timezoneId:'Asia/Tehran',colorScheme:'light',serviceWorkers:'block',trace:'retain-on-failure',screenshot:'only-on-failure',launchOptions:{args:['--disable-background-networking','--disable-component-update','--no-default-browser-check']}},projects:[{name:'desktop',use:{viewport:{width:1440,height:1000}}},{name:'mobile',use:{viewport:{width:390,height:844},isMobile:true,hasTouch:true}}]};
 fs.writeFileSync(`${work}/hybrid-playwright.config.mjs`,`export default ${JSON.stringify(configuration,null,2)};\n`,{flag:'wx'});
 const fd=fs.openSync(`${evidence}/browser.log`,'wx');const code=await new Promise(resolve=>{const child=spawn(process.execPath,[`${root}/frontend/node_modules/@playwright/test/cli.js`,'test','--config',`${work}/hybrid-playwright.config.mjs`],{cwd:`${candidate}/frontend`,env:process.env,windowsHide:true,shell:false,stdio:['ignore',fd,fd]});child.on('error',()=>resolve(-1));child.on('close',value=>resolve(value??-1));});fs.closeSync(fd);
 const tests=read(`${evidence}/playwright-result.json`);result={...result,exitCode:code,stats:tests.stats,passed:tests.stats.expected,failed:tests.stats.unexpected,flaky:tests.stats.flaky,skipped:tests.stats.skipped,liveStaticInputs:[...staticInputs].map(([path,sha256])=>({path,sha256})),candidateStaticInputs:[...candidateInputs].map(([path,sha256])=>({path,sha256})),testSourceSha256:sha(`${candidate}/frontend/tests/e2e/actions-create-reset.spec.ts`)};
 assert.equal(code,0);assert.equal(tests.stats.unexpected,0);assert.equal(tests.stats.flaky,0);assert.equal(tests.stats.skipped,0);assert.equal(tests.stats.expected,24);frozen();result.status='PASS';
}catch(error){result.error=error.message;process.exitCode=1;}
finally{await new Promise(resolve=>server.close(resolve));result.serverClosed=true;fs.writeFileSync(`${evidence}/e2e-validation.json`,JSON.stringify(result,null,2),{flag:'wx'});console.log(JSON.stringify({status:result.status,passed:result.passed,error:result.error}));}
