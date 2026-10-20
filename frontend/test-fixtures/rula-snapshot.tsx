import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route, Link } from 'react-router-dom';
import { LocaleProvider } from '../src/i18n';
import { DialogProvider } from '../src/components/UI';
import { RulaReportPage } from '../src/features/assessments/AssessmentPages';
import '../src/styles.css';
localStorage.setItem('nivasafe-session', JSON.stringify({ accessToken:'synthetic',refreshToken:'synthetic',user:{id:'test-user',email:'fixture@example.invalid',displayName:'Fixture',globalRole:'SUPER_ADMIN'},organizations:[{id:'test-org',nameFa:'تست',nameEn:'Fixture',role:'ORG_ADMIN'}] }));
localStorage.setItem('nivasafe-org','test-org');
const id='00000000-0000-4000-8000-000000000001';
const row={angle:25,score:2,detected:true,source:'AI',confirmedByUser:false};
const analysis={upperArm:row,lowerArm:row,wrist:row,wristTwist:row,neck:row,trunk:row,legs:row};
const snapshot={suggestions:[{id:'stable',titleFa:'پیشنهاد ثابت',titleEn:'Stable recommendation',descriptionFa:'این نتیجه باید ثابت بماند',descriptionEn:'Keep this result',bodySide:'RIGHT',priority:'HIGH',scoreReduction:1,affectedParts:['neck'],source:'AI'}],provider:'synthetic',model:'fixture',aiStatus:'connected',reasonCode:null,reasonMessage:null,minimum:0,maximum:20};
const original=window.fetch.bind(window);
window.fetch=async(input,init)=>{
 const url=String(input);if(!url.includes('/api/v1/'))return original(input,init);
 let data:unknown=[];const path=url.split('/api/v1')[1];
 if(path.endsWith('/action-suggestions')){
   localStorage.setItem('snapshot-post-count',String(Number(localStorage.getItem('snapshot-post-count')??0)+1));
   localStorage.setItem('saved-suggestion-snapshot',JSON.stringify(snapshot)); data=snapshot;
 } else if(path.endsWith('/report')) {
   const saved=JSON.parse(localStorage.getItem('saved-suggestion-snapshot')??'null');
   data={assessment:{id,title:'Synthetic saved RULA',project:{id:'project',name:'Fixture',nameFa:'تست'},score:7,actionLevel:4,explanation:'Synthetic',status:'APPROVED',updatedAt:new Date().toISOString(),bodySide:'RIGHT',postureReviewComplete:true,postureAnalysis:analysis},factors:[],actions:[],predictedScore:7,suggestionSnapshot:saved,suggestedActions:saved?.suggestions??[]};
 }
 return new Response(JSON.stringify({data}),{status:200,headers:{'Content-Type':'application/json'}});
};
createRoot(document.getElementById('root')!).render(<LocaleProvider><DialogProvider><MemoryRouter initialEntries={['/rula/'+id+'/report']}><Link id="leave-report" to="/away">Leave</Link><Link id="open-report" to={'/rula/'+id+'/report'}>Reopen</Link><Routes><Route path="/rula/:id/report" element={<RulaReportPage/>}/><Route path="/away" element={<p>Away</p>}/></Routes></MemoryRouter></DialogProvider></LocaleProvider>);
