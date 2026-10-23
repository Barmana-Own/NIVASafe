import fs from 'node:fs';
import http from 'node:http';
import assert from 'node:assert/strict';
import {spawn,spawnSync}from'node:child_process';
import {work,evidence,imageLocation}from'./prepare-proxy.mjs';
const delayMs=65_000;
let received=0;const timers=new Set();
const upstream=http.createServer((req,res)=>{received++;const timer=setTimeout(()=>{timers.delete(timer);res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({status:'DELAYED_SUCCESS'}));},delayMs);timers.add(timer);});
await new Promise((resolve,reject)=>{upstream.once('error',reject);upstream.listen(5159,'127.0.0.1',resolve);});
const file=`${work}/nginx-isolated-delay.conf`;
fs.writeFileSync(file,`daemon off;\nmaster_process off;\nworker_processes 1;\npid ${work}/nginx-isolated-delay.pid;\nerror_log ${work}/nginx-isolated-delay.error.log;\nevents { worker_connections 32; }\nhttp {\n access_log off;\n map $http_upgrade $connection_upgrade { default upgrade; '' close; }\n server { listen 127.0.0.1:5160;\n${imageLocation.replace('127.0.0.1:5044','127.0.0.1:5159')} location /ready { return 200; }\n }\n}\n`);
const syntax=spawnSync('C:/Runtime/nginx/nginx.exe',['-p','C:/Runtime/nginx/','-t','-c',file],{encoding:'utf8',windowsHide:true});
assert.equal(syntax.status,0,'Isolated NGINX syntax invalid');
const child=spawn('C:/Runtime/nginx/nginx.exe',['-p','C:/Runtime/nginx/','-c',file],{windowsHide:true,stdio:['ignore','ignore','ignore']});
const completion=new Promise(resolve=>child.once('close',resolve));
try{
 let ready=false;for(let n=0;n<30;n++){try{if((await fetch('http://127.0.0.1:5160/ready',{signal:AbortSignal.timeout(500)})).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}
 assert(ready,'Isolated proxy did not start');const start=performance.now();
 const response=await fetch('http://127.0.0.1:5160/api/v1/rula/posture-image-analysis',{method:'POST',body:'synthetic-no-image',signal:AbortSignal.timeout(80000)});
 assert.equal(response.status,200);assert.equal((await response.json()).status,'DELAYED_SUCCESS');assert.equal(received,1);
 const elapsedMs=Math.round(performance.now()-start);assert(elapsedMs>=delayMs&&elapsedMs<80000);
 const result={status:'PASS',elapsedMs,receivedUpstreamRequests:received,route:'/api/v1/rula/posture-image-analysis',configuredImageReadTimeoutSeconds:300,sameImageLocationAsProductionCandidate:true,realProviderCalls:0,realImageBytes:0,isolatedLoopbackOnly:true};
 fs.writeFileSync(`${evidence}/proxy-delay-smoke.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{for(const timer of timers)clearTimeout(timer);upstream.closeAllConnections();await new Promise(resolve=>upstream.close(resolve));child.kill();await completion;}
