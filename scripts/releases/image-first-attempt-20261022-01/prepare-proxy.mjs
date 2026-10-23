import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash}from'node:crypto';
import {spawnSync}from'node:child_process';

export const root='C:/NIVASafe', task='image-first-attempt-20261022-01', id=`release-${task}`;
export const evidence=`${root}/reports/evidence/${task}`;
export const work=`${root}/.local/${task}`;
export const proxy='C:/Runtime/nginx/conf/nginx.conf';
export const example=`${root}/deployment/infrastructure/nginx/windows-production.conf.example`;
export const sha=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
export const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
export const imageLocation=`        # Keep the bounded image request alive through local pose and existing validation.
        location ~ ^/api/v1/(?:rula/posture-image-analysis|fmea/process-image-analysis)$ {
            proxy_pass http://127.0.0.1:5044;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection $connection_upgrade;
            proxy_read_timeout 300s;
            proxy_send_timeout 120s;
        }

`;
export function patchedProxy(text){
  assert(!text.includes('location ~ ^/api/v1/(?:rula/posture-image-analysis|fmea/process-image-analysis)$'));
  const appMarker='        location /api/ {';
  assert.equal(text.split(appMarker).length,2);
  const appAt=text.indexOf(appMarker);
  const apiServer=text.indexOf('        server_name api.nivasafe.com;',appAt);
  assert(apiServer>appAt);
  const apiAt=text.indexOf('        location / {',apiServer);
  assert(apiAt>apiServer);
  let after=text.slice(0,apiAt)+imageLocation+text.slice(apiAt);
  after=after.slice(0,appAt)+imageLocation+after.slice(appAt);
  assert.equal(after.replaceAll(imageLocation,''),text,'Unrelated proxy configuration changed');
  return after;
}
export function nginxCheck(file){
  const temporary=`C:/Runtime/nginx/conf/nginx-${task}.validation.conf`;
  const inPlace=file.replaceAll('\\','/').startsWith('C:/Runtime/nginx/conf/');
  if(!inPlace)fs.copyFileSync(file,temporary,fs.constants.COPYFILE_EXCL);
  try{const r=spawnSync('C:/Runtime/nginx/nginx.exe',['-p','C:/Runtime/nginx/','-t','-c',inPlace?file:temporary],{encoding:'utf8',windowsHide:true});
  assert.equal(r.status,0,'NGINX configuration validation failed');return {exitCode:r.status,message:(r.stdout+r.stderr).trim()};}finally{if(!inPlace)fs.unlinkSync(temporary);}
}
if(process.argv.includes('--prepare')){
 fs.mkdirSync(work,{recursive:true});fs.mkdirSync(evidence,{recursive:true});
 assert(!fs.existsSync(`${evidence}/proxy-preparation.json`),'Proxy preparation already recorded');
 const previous=fs.readFileSync(proxy,'utf8');const next=patchedProxy(previous);
 if(fs.existsSync(`${work}/nginx-before.conf`))assert.equal(fs.readFileSync(`${work}/nginx-before.conf`,'utf8'),previous);else fs.writeFileSync(`${work}/nginx-before.conf`,previous,{flag:'wx'});
 if(fs.existsSync(`${work}/nginx-candidate.conf`))assert.equal(fs.readFileSync(`${work}/nginx-candidate.conf`,'utf8'),next);else fs.writeFileSync(`${work}/nginx-candidate.conf`,next,{flag:'wx'});
 const syntax=nginxCheck(`${work}/nginx-candidate.conf`);
 const exampleBefore=fs.readFileSync(example,'utf8');
 fs.writeFileSync(`${work}/nginx-example-before.conf`,exampleBefore,{flag:'wx'});
 const exampleAfter=patchedProxy(exampleBefore);fs.writeFileSync(example,exampleAfter);
 const result={status:'PREPARED',task,proxyBeforeSha256:sha(proxy),proxyCandidateSha256:sha(`${work}/nginx-candidate.conf`),exampleBeforeSha256:sha(`${work}/nginx-example-before.conf`),exampleAfterSha256:sha(example),genericReadTimeoutUnchanged:120,imageReadTimeout:300,providerTimeoutPerAttempt:120,existingResponseValidationMaxAttempts:2,localPoseMaxSeconds:20,remainingBudgetSeconds:40,addedLocations:2,onlyTwoImagePaths:true,syntax};
 fs.writeFileSync(`${evidence}/proxy-preparation.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}
