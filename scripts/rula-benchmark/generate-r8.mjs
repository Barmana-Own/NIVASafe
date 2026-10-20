// Independent analytic reference generator. No production inference imports or AI output.
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {mkdirSync,writeFileSync,readFileSync,existsSync} from 'node:fs';
import {join,resolve} from 'node:path';
const root=resolve(import.meta.dirname,'../..');
const sharp=createRequire(join(root,'.local/rula-final-candidate-20261017-053748/backend/package.json'))('sharp');
const output=resolve(process.argv[2]??join(root,'reports/evidence/rula-landmarks-r8-20261019/benchmark-v4'));
if(existsSync(join(output,'manifest.json'))) throw new Error('Frozen benchmark exists. Use a different output; never relabel it.');
mkdirSync(output,{recursive:true});
const seed='NIVASafe-independent-rigs-R8-20261019-v1';
const hash=b=>createHash('sha256').update(b).digest('hex');
const rad=d=>d*Math.PI/180,deg=r=>r*180/Math.PI;
const add=(a,b)=>({x:a.x+b.x,y:a.y+b.y});
const mul=(v,l)=>({x:v.x*l,y:v.y*l});
const rotate=(v,d)=>({x:v.x*Math.cos(rad(d))-v.y*Math.sin(rad(d)),y:v.x*Math.sin(rad(d))+v.y*Math.cos(rad(d))});
const delta=(a,b)=>({x:b.x-a.x,y:b.y-a.y});
const length=v=>Math.hypot(v.x,v.y);
const interior=(a,b)=>{
  const cosine=Math.max(-1,Math.min(1,(a.x*b.x+a.y*b.y)/(length(a)*length(b))));
  // acos is ill-conditioned at +/-1. Snap only machine-roundoff proximity.
  return Math.abs(1-Math.abs(cosine))<1e-14?(cosine<0?180:0):deg(Math.acos(cosine));
};
const signed=(a,b)=>deg(Math.atan2(a.x*b.y-a.y*b.x,a.x*b.x+a.y*b.y));
// Independently transcribed *base* categories. Modifiers/load/3D rotation remain unestablished.
export function referenceBand(part,a){
  const v=Math.abs(a); if(part==='upperArm') return a < -20?2:v<=20?1:v<=45?2:v<=90?3:4;
  if(part==='lowerArm') return a>=60&&a<=100?1:2;
  if(part==='wrist') return v<1e-7?1:v<=15?2:3;
  if(part==='neck') return a< -1e-7?4:a<=10?1:a<=20?2:3;
  return v<1e-7?1:v<=20?2:v<=60?3:4;
}
const specs=[
  [0,90,0,0,0],[19,59,14,12,9],[21,61,16,22,11],[44,99,0,30,18],
  [46,101,25,18,22],[89,125,12,48,30],[91,155,30,64,14],[-25,45,18,8,-12],
  [65,75,8,25,16],[35,135,22,37,24],[10,170,0,-8,8],[110,35,35,55,-16],
  [28,92,5,14,17],[72,64,19,42,6],[15,112,10,16,13],[53,82,24,28,26],
  // Held-out independently fixed configurations, not derived from development predictions.
  [32,68,9,26,14],[78,115,21,44,25],[-32,148,0,7,-18],[102,88,28,62,18],
  [23,103,17,21,11],[58,52,7,35,23],[12,165,12,13,7],[86,96,26,52,29],
];
const scenes=[];
for(let i=0;i<24;i++){
  const id=`rig-${String(i+1).padStart(2,'0')}`,split=i<16?'development':'heldout';
  const double=[0,3,5,8,11,14,16,19,22].includes(i);
  const view=[12,20].includes(i)?'FRONTAL':[13,21].includes(i)?'OBLIQUE':'SAGITTAL';
  const occluded=[14,22].includes(i)?['wrist','hand']:[];
  const rotated=[10,18].includes(i)?90:0;
  const W=double?1100:620,H=[6,17].includes(i)?900:760;
  const scale=[1,.86,1.1,.95][i%4]*(H/760);
  const contrast=[15,23].includes(i)?'LOW':'NORMAL';
  const people=[];
  const count=double?2:1;
  for(let j=0;j<count;j++){
    const side=count===2?(j===0?'RIGHT':'LEFT'):(i%2===0?'RIGHT':'LEFT');
    const facing=[2,7,16,19,23].includes(i)?'IMAGE_LEFT':'IMAGE_RIGHT',sign=facing==='IMAGE_RIGHT'?1:-1;
    const p=specs[i], [u,e,w,t,n]=j===0?p:[Math.max(-35,p[0]-37),180-p[1]+25,p[2]+3,Math.max(-12,p[3]-17),-p[4]/2];
    const origin={x:count===2?W*(j===0?.27:.75):W*.46,y:H*.54};
    const torso=180*scale,upper=(100+((i+j)%3)*9)*scale,lower=(98+((i+2*j)%4)*7)*scale;
    const up=rotate({x:0,y:-1},sign*t),down=mul(up,-1);
    const shoulder=add(origin,mul(up,torso)),neck=add(shoulder,mul(up,30*scale));
    const head=add(neck,mul(rotate(up,sign*n),35*scale));
    const arm=rotate(down,-sign*u),elbow=add(shoulder,mul(arm,upper));
    const bend=(i+j)%2===0?-1:1,fore=rotate(mul(arm,-1),bend*sign*e);
    const wrist=add(elbow,mul(fore,lower)),hand=add(wrist,mul(rotate(fore,sign*w),38*scale));
    const knee=add(origin,{x:0,y:100*scale}),ankle=add(knee,{x:0,y:95*scale});
    let points={head,neck,shoulder,elbow,wrist,hand,hip:origin,knee,ankle};
    const transform=q=>rotated===90?{x:H-q.y,y:q.x}:q;
    const dims=rotated===90?{width:H,height:W}:{width:W,height:H};
    points=Object.fromEntries(Object.entries(points).map(([k,v])=>[k,transform(v)]));
    const gravityUp=rotated===90?{x:1,y:0}:{x:0,y:-1};
    // Fit each independently drawn person into its panel by translation only.
    // This corrects pre-inference generator clipping without changing any angles.
    const lo=rotated===90?40:(count===2?j*W/2+40:40);
    const hi=rotated===90?dims.width-40:(count===2?(j+1)*W/2-40:dims.width-40);
    const xs=Object.values(points).map(v=>v.x),ys=Object.values(points).map(v=>v.y);
    const dx=Math.min(...xs)<lo?lo-Math.min(...xs):Math.max(...xs)>hi?hi-Math.max(...xs):0;
    const dy=Math.min(...ys)<80?80-Math.min(...ys):Math.max(...ys)>dims.height-70?dims.height-70-Math.max(...ys):0;
    points=Object.fromEntries(Object.entries(points).map(([k,v])=>[k,{x:v.x+dx,y:v.y+dy}]));
    const normalized=Object.fromEntries(Object.entries(points).map(([k,v])=>[k,{x:v.x/dims.width,y:v.y/dims.height,visibility:occluded.includes(k)?'OCCLUDED':'VISIBLE'}]));
    // Calculation uses actual independently defined points, not the specification angles.
    const v=(a,b)=>delta(points[a],points[b]);
    const values={upperArm:-sign*signed(v('shoulder','hip'),v('shoulder','elbow')),lowerArm:interior(v('elbow','shoulder'),v('elbow','wrist')),wrist:interior(v('elbow','wrist'),v('wrist','hand')),neck:sign*signed(v('hip','neck'),v('neck','head')),trunk:sign*signed(gravityUp,v('hip','shoulder'))};
    const needs={upperArm:['shoulder','hip','elbow'],lowerArm:['shoulder','elbow','wrist'],wrist:['elbow','wrist','hand'],neck:['hip','neck','head'],trunk:['hip','shoulder']};
    const measurements=Object.fromEntries(Object.entries(values).map(([part,value])=>{
      const code=view!=='SAGITTAL'?'UNMEASURABLE_FROM_SINGLE_2D_VIEW':needs[part].some(k=>occluded.includes(k))?'LANDMARK_OCCLUDED':null;
      return [part,{reference:value,measurable:code===null,reason:code,referenceType:part==='neck'?'IMAGE_PLANE_HEAD_AXIS_PROXY_NOT_CERVICAL':'ANALYTIC_IMAGE_PLANE',baseScore:code===null?referenceBand(part,value):null}];
    }));
    measurements.wristTwist={reference:null,measurable:false,reason:'UNMEASURABLE_FROM_SINGLE_2D_VIEW',referenceType:'AXIAL_3D'};
    people.push({id:`${id}-${j===0?'A':'B'}`,displayId:j===0?'A':'B',side,view,facing,gravityUp,landmarks:normalized,pixelPoints:points,measurements,torsoLength:torso,upperArmLength:upper,occluded,scale});
  }
  const dim=rotated===90?{width:H,height:W}:{width:W,height:H};
  const ink=contrast==='LOW'?'#93989f':'#193c5f',bg=contrast==='LOW'?'#e1e3e5':'#ffffff';
  const line=(a,b,width=9)=>`<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${ink}" stroke-width="${width}" stroke-linecap="round"/>`;
  const coordinateTransform=rotated===90?`translate(${H},0) rotate(90)`:'';
  let shapes='';
  for(const person of people){
    const p=person.pixelPoints;
    shapes+=`<text x="${Math.max(12,p.shoulder.x-90)}" y="${Math.max(28,p.head.y-48)}" font-family="Arial" font-size="22" fill="#111">${person.displayId}: ANATOMICAL ${person.side}</text>`;
    for(const [a,b] of [['neck','head'],['neck','shoulder'],['shoulder','hip'],['shoulder','elbow'],['elbow','wrist'],['wrist','hand'],['hip','knee'],['knee','ankle']]) shapes+=line(p[a],p[b],a==='wrist'?7:9);
    // An explicit face/nose and feet provide orientation, not angle/reference labels.
    const face=person.facing==='IMAGE_RIGHT'?1:-1;
    const nose=rotated===90?{x:0,y:face*24*person.scale}:{x:face*24*person.scale,y:0};
    shapes+=`<circle cx="${p.head.x}" cy="${p.head.y}" r="${22*person.scale}" fill="${bg}" stroke="${ink}" stroke-width="5"/>`;
    if(view==='SAGITTAL')shapes+=line(add(p.head,nose),add(p.head,mul(nose,1.35)),5);
    else {
      // Make non-sagittal artwork visibly different, not just a different caption.
      // This illustrative projection has no asserted sagittal/axial 3D ground truth.
      const across=rotated===90?{x:0,y:view==='FRONTAL'?-76:-37}:{x:view==='FRONTAL'?-76:-37,y:0};
      const farShoulder=add(p.shoulder,across),farHip=add(p.hip,mul(across,.65));
      const farElbow=add(farShoulder,rotated===90?{x:-60,y:-45}:{x:-45,y:60});
      const farWrist=add(farElbow,rotated===90?{x:-60,y:15}:{x:15,y:60});
      shapes+=line(p.shoulder,farShoulder,6)+line(farShoulder,farHip,6)+line(p.hip,farHip,6)+line(farShoulder,farElbow,7)+line(farElbow,farWrist,7);
      const legOffset=rotated===90?{x:0,y:-40}:{x:-40,y:0};
      shapes+=line(farHip,add(p.knee,legOffset),7)+line(add(p.knee,legOffset),add(p.ankle,legOffset),7);
      shapes+=`<circle cx="${p.head.x-7}" cy="${p.head.y-2}" r="2" fill="${ink}"/><circle cx="${p.head.x+7}" cy="${p.head.y-2}" r="2" fill="${ink}"/>`;
    }
    shapes+=line(p.ankle,add(p.ankle,rotated===90?{x:0,y:face*38*person.scale}:{x:face*38*person.scale,y:0}),7);
    for(const key of ['shoulder','elbow','wrist','hip','neck']) shapes+=`<circle cx="${p[key].x}" cy="${p[key].y}" r="5" fill="${ink}"/>`;
    if(person.occluded.length){const q=p.wrist;shapes+=`<rect x="${q.x-42}" y="${q.y-50}" width="110" height="100" rx="3" fill="#747b83"/><text x="${q.x-36}" y="${q.y}" font-family="Arial" font-size="13" fill="white">OCCLUDER</text>`;}
  }
  const upArrow=`<g transform="${coordinateTransform}"><line x1="35" y1="100" x2="35" y2="50" stroke="#333" stroke-width="3"/><path d="M29 60 L35 50 L41 60" fill="none" stroke="#333" stroke-width="3"/><text x="20" y="124" font-family="Arial" font-size="14">UP</text></g>`;
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${dim.width}" height="${dim.height}"><rect width="100%" height="100%" fill="${bg}"/>${shapes}${upArrow}<text x="16" y="${dim.height-20}" font-family="Arial" font-size="16" fill="#444">Synthetic rig; ${view} view. Identity labels are not instructions.</text></svg>`;
  const svgName=`${id}.svg`,imageName=`${id}.png`,metadataName=`${id}.json`;
  writeFileSync(join(output,svgName),svg);
  const image=await sharp(Buffer.from(svg)).png().toBuffer();writeFileSync(join(output,imageName),image);
  const metadata={schema:'independent-rig-v1',seed,id,split,...dim,rotation:rotated,contrast,referenceSource:'Manually specified independent bone vectors; acos/dot and signed atan2 from actual pixel coordinates',people,modelPredictionUsedForReference:false,clinicalValidation:false};
  writeFileSync(join(output,metadataName),JSON.stringify(metadata,null,2));
  scenes.push({id,split,width:dim.width,height:dim.height,people:people.length,image:imageName,imageSha256:hash(image),reference:metadataName,referenceSha256:hash(readFileSync(join(output,metadataName))),svg:svgName,svgSha256:hash(Buffer.from(svg))});
}
const manifest={version:'independent-rigs-r8-v1',seed,frozenAt:new Date().toISOString(),sceneCount:24,developmentScenes:16,heldoutScenes:8,splitUnit:'unique scene/rig configuration; no rendered copies or model repetitions as independent scenes',qualifiedHumanPhotoValidation:false,heldoutInferenceInspectedAtFreeze:false,scenes};
writeFileSync(join(output,'manifest.json'),JSON.stringify(manifest,null,2));
writeFileSync(join(output,'heldout-lock.json'),JSON.stringify({frozenAt:manifest.frozenAt,manifestSha256:hash(readFileSync(join(output,'manifest.json'))),scenes:scenes.filter(s=>s.split==='heldout'),rule:'Do not tune prompts, thresholds or parser from held-out inference outcomes. All cases remain in the denominator.'},null,2));
console.log(JSON.stringify({output,sceneCount:24,development:16,heldout:8,manifestSha256:hash(readFileSync(join(output,'manifest.json')))}));
