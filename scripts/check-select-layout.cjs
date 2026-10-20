const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_CORE_PATH || 'playwright-core');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{const page=await browser.newPage();const results=[];
for(const width of [390,768,1280,1600]){await page.setViewportSize({width,height:900});await page.goto('http://127.0.0.1:5178/test-fixtures/select-layout.html');const trigger=page.getByRole('combobox');await trigger.waitFor();const before=await trigger.boundingBox();
for(const label of ['سمت چپ','هر دو سمت','سمت راست']){await trigger.click();for(let i=0;i<5;i++){await page.waitForTimeout(100);const box=await trigger.boundingBox();assert(Math.abs(box.width-before.width)<1,`Trigger changed width at ${width}`);}await page.getByRole('option',{name:label,exact:true}).click();const after=await trigger.boundingBox();assert(Math.abs(after.width-before.width)<1,`Selection changed width at ${width}`);}
results.push({viewport:width,triggerWidth:before.width,stable:true});}console.log(JSON.stringify({status:'PASS',results}));}finally{await browser.close();}})().catch(e=>{console.error(e.message);process.exitCode=1});
