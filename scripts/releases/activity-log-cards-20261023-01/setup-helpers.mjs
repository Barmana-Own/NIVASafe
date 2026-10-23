import fs from 'node:fs';
import assert from 'node:assert/strict';
const root='C:/NIVASafe',previous='company-directory-cards-20261023-01',task='activity-log-cards-20261023-01';
for(const name of ['prepare.mjs','validate.mjs','release.mjs']){
 let text=fs.readFileSync(`${root}/scripts/releases/${previous}/${name}`,'utf8');
 text=text.replaceAll(previous,task).replaceAll('company-directory-cards','activity-log-cards').replaceAll('companyDirectoryCards20261023','activityLogCards20261023');
 if(name==='prepare.mjs'){
  text=text.replaceAll('action-context-reset-20261023-01',previous).replaceAll('company-cards.css','activity-cards.css');
  text=text.replaceAll('Owner-requested responsive cards for the accessible-company directory only.','Owner-requested four-column cards for registered activities only.');
  text=text.replaceAll('Only accessible-company rows become five desktop columns with responsive 4/3/2/1 reductions. Preserve all company text/count/status, enter/activation handlers, unrelated UI, backend, API, authentication, database and runtime configuration.','Only registered-activity rows become four desktop cards with responsive 3/2/1 reductions. Preserve all six field values/labels, details expansion, filters, search/reset/retry, unrelated UI, backend, API, authentication, database and runtime configuration.');
 }
 if(name==='release.mjs')text=text.replaceAll("'/organizations'","'/activity-log'");
 assert(!text.includes('companyDirectoryCards20261023'));
 fs.writeFileSync(`${root}/scripts/releases/${task}/${name}`,text,{flag:'wx'});
}
console.log('Scoped release helpers prepared');
