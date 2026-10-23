import fs from 'node:fs';
import {root,task} from './prepare.mjs';
const target=`${root}/scripts/releases/${task}`;
const read=p=>fs.readFileSync(`${root}/scripts/releases/${p}`,'utf8');
let validate=read('rula-photo-side-values-20261022-01/validate.mjs').replaceAll('oldApiRoot','oldApiRoot');
fs.writeFileSync(`${target}/validate.mjs`,validate,{flag:'wx'});
const plan=read('assistant-chat-density-20261023-01/plan.mjs').replaceAll('assistant-chat-density-','rula-review-tables-').replace('preservedStylesheets.length,16','preservedStylesheets.length,18');
fs.writeFileSync(`${target}/plan.mjs`,plan,{flag:'wx'});
console.log('VALIDATE_AND_PLAN_CREATED');
