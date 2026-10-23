import fs from 'node:fs';
const root='C:/NIVASafe',previous='activity-log-cards-20261023-01',task='rula-cancel-hide-20261023-01',baseline='assistant-chat-density-20261023-01';
for(const name of ['prepare.mjs','validate.mjs','release.mjs']){
 let value=fs.readFileSync(`${root}/scripts/releases/${previous}/${name}`,'utf8');
 value=value.replaceAll(previous,task).replaceAll('activity-log-cards','rula-cancel-hide').replaceAll('activityLogCards20261023','rulaCancelHide20261023');
 if(name==='prepare.mjs'){
  value=value.replaceAll('company-directory-cards-20261023-01',baseline).replaceAll('activity-cards.css','cancel-button.css');
  value=value.replaceAll('Owner-requested four-column cards for registered activities only.','Owner-requested cancellation-button styling, retained while its UI is temporarily hidden.');
  value=value.replaceAll('Only registered-activity rows become four desktop cards with responsive 3/2/1 reductions. Preserve all six field values/labels, details expansion, filters, search/reset/retry, unrelated UI, backend, API, authentication, database and runtime configuration.','Only style and temporarily hide the two existing Cancel image analysis controls in the RULA loading note and image review. Preserve analysis/cancellation handlers, queue, requests, image cards, progress/error/retry and all unrelated UI/backend/API/auth/data.');
 }
 if(name==='release.mjs')value=value.replaceAll("'/activity-log'","'/rula'");
 fs.writeFileSync(`${root}/scripts/releases/${task}/${name}`,value,{flag:'wx'});
}
console.log('Scoped CSS-only helpers generated');
