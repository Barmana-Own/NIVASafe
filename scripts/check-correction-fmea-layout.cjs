const assert = require('node:assert/strict');
const fs = require('node:fs');
const {chromium} = require(process.env.PLAYWRIGHT_CORE_PATH || 'playwright-core');
(async()=>{
  const css=fs.readFileSync('frontend/src/styles.css','utf8');
  const table=(wrap,klass,count)=>`<div class="table-wrap report-data-table-wrap ${wrap}"><table class="assessment-report-table ${klass}"><thead><tr>${'<th>عنوان ستون</th>'.repeat(count)}</tr></thead><tbody>${[1,2].map(()=>`<tr>${'<td>متن توضیحی<br>ردیف دوم</td>'.repeat(count)}</tr>`).join('')}</tbody></table></div>`;
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try{const page=await browser.newPage();const results=[];for(const width of [768,1024,1554]){
    await page.setViewportSize({width,height:900});
    await page.setContent(`<html dir="rtl"><head><style>${css}</style></head><body><main style="margin:20px">${table('rula-correction-table-wrap','rula-correction-table',6)}${table('fmea-report-table-wrap','fmea-report-data-table',12)}</main></body></html>`);
    const rows=await page.evaluate(()=>Array.from(document.querySelectorAll('.table-wrap')).map(w=>{const t=w.querySelector('table');return{gutter:getComputedStyle(w).scrollbarGutter,padding:getComputedStyle(w).paddingRight,rightGap:w.getBoundingClientRect().right-t.getBoundingClientRect().right,borders:Array.from(t.querySelectorAll('tbody tr')).map(r=>Array.from(r.children).slice(0,-1).map(c=>getComputedStyle(c).borderInlineEndWidth))};}));
    for(const row of rows){assert.equal(row.gutter,'auto');assert.equal(row.padding,'0px');assert(row.rightGap<=2,`Right gutter remains: ${row.rightGap}`);assert(row.borders.flat().every(b=>b==='1px'),'Missing body column separators');}
    results.push({width,tables:rows});
  }console.log(JSON.stringify({status:'PASS',results}));}finally{await browser.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1});
