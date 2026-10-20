import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { LocaleProvider } from '../src/i18n';
import { DialogProvider } from '../src/components/UI';
import { RulaReportPage } from '../src/features/assessments/AssessmentPages';
import '../src/styles.css';
localStorage.setItem('nivasafe-session',JSON.stringify({accessToken:'synthetic',refreshToken:'synthetic',user:{id:'test-user',displayName:'Fixture',globalRole:'SUPER_ADMIN'},organizations:[{id:'test-org',nameFa:'تست',nameEn:'Fixture',role:'ORG_ADMIN'}]}));localStorage.setItem('nivasafe-org','test-org');
const id='00000000-0000-4000-8000-000000000001';
const part=(score:number,angle:number|null)=>({angle,score,detected:angle!==null,source:'AI',confirmedByUser:false});
const analysis={upperArm:part(3,60),lowerArm:part(2,35),wrist:part(1,5),wristTwist:part(1,15),neck:part(3,30),trunk:part(2,20),legs:part(1,null)};
const actions=[{id:'a',title:'تنظیم ارتفاع سطح کار',description:'توضیح کامل اقدام برای گردن. '.repeat(35),priority:'HIGH',status:'IN_PROGRESS',progress:20,rulaImpact:{scoreReduction:1,affectedParts:['neck']}},{id:'b',title:'کاهش خم شدن گردن',description:'پیشنهاد دوم گردن',priority:'MEDIUM',status:'COMPLETED',progress:100,rulaImpact:{scoreReduction:1,affectedParts:['neck']}},{id:'general',title:'اقدام عمومی',description:'توضیح عمومی',priority:'LOW',status:'IN_PROGRESS',progress:10,rulaImpact:{scoreReduction:0,affectedParts:[]}}];
const initial={assessment:{id,title:'Synthetic saved RULA',project:{id:'project',name:'Fixture'},score:7,actionLevel:4,explanation:'Synthetic',status:'APPROVED',updatedAt:'2026-10-09T10:00:00Z',bodySide:'RIGHT',postureReviewComplete:true,postureAnalysis:{...analysis,imageAssessments:[{imageKey:'image-one',fileName:'first.png',analysis:{...analysis,neck:part(4,45)},force:1,muscleUse:true},{imageKey:'image-two',fileName:'second.png',analysis:{...analysis,trunk:part(5,70)},force:2,muscleUse:false}],evaluationRows:[{id:'upperArm',group:'A',bodyPart:'بازوی بالا',scoreShare:37,title:'اقدام ثبت‌شده روی ردیف',description:'شرح اقدام بدون ارتباط با رکورد مستقل',priority:'LOW',status:'UNSELECTED'}]}},factors:[{key:'neck',angle:30,score:3,detected:true,source:'AI',reviewed:true,impactPercent:29,impactLevel:'HIGH'}],actions,predictedScore:5,suggestionSnapshot:{suggestions:[],provider:'synthetic',model:'fixture',aiStatus:'connected',reasonCode:null,reasonMessage:null,minimum:0,maximum:20},suggestedActions:[]};
const original=window.fetch.bind(window);
window.fetch=async(input,init)=>{
 const url=String(input);if(!url.includes('/api/v1/'))return original(input,init);
 const report=JSON.parse(localStorage.getItem('mobile-report-state')??JSON.stringify(initial));
 const path=url.split('/api/v1')[1];let data:unknown=report;let status=200;
 if(init?.method==='PATCH'){
  const body=JSON.parse(String(init.body));const calls=JSON.parse(localStorage.getItem('mobile-api-calls')??'[]');calls.push({path,body});localStorage.setItem('mobile-api-calls',JSON.stringify(calls));
  if(localStorage.getItem('fail-next-mobile-save')==='yes'){localStorage.removeItem('fail-next-mobile-save');return new Response(JSON.stringify({error:{message:'Synthetic save failure'}}),{status:500,headers:{'Content-Type':'application/json'}});}
  if(path.startsWith('/actions/')){const action=report.actions.find((row:{id:string})=>row.id===path.split('/').at(-1));Object.assign(action,body);data=action;}else{Object.assign(report.assessment,body);data=report.assessment;}
  localStorage.setItem('mobile-report-state',JSON.stringify(report));
 }else if(path.includes('action-suggestions')){status=500;data={unexpectedAi:true};localStorage.setItem('unexpected-mobile-ai','yes');}
 return new Response(JSON.stringify({data}),{status,headers:{'Content-Type':'application/json'}});
};
createRoot(document.getElementById('root')!).render(<LocaleProvider><DialogProvider><MemoryRouter initialEntries={['/rula/'+id+'/report']}><Routes><Route path="/rula/:id/report" element={<RulaReportPage/>}/></Routes></MemoryRouter></DialogProvider></LocaleProvider>);
