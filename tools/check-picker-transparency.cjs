const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.argv[2]||'playwright');
const root=path.resolve(__dirname,'..'),executablePath=process.argv[3];
(async()=>{
 const browser=await chromium.launch({headless:true,...(executablePath?{executablePath}:{})});
 for(const [theme,width,height] of [['dark',1200,900],['light',1200,900],['dark',390,844]]){
  const page=await browser.newPage({viewport:{width,height}});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/*',route=>{
   const url=new URL(route.request().url());
   if(url.pathname==='/')return route.fulfill({contentType:'text/html',body:`<link rel="stylesheet" href="/styles.css"><style>html{color-scheme:${theme}}body{background:rgb(200,30,120)}#topic-content-settings-dialog::backdrop{background:transparent}</style><h1>Host canvas</h1><dialog id="topic-content-settings-dialog" class="topic-content-settings-dialog"><button id="open">Open picker</button></dialog><script type="module">import {StoryColorPickerManager} from '/lib/story-color-picker.mjs';document.querySelector('dialog').showModal();const picker=new StoryColorPickerManager();document.getElementById('open').onclick=()=>picker.open({paint:{kind:'gradient',type:'linear',angle:90,stops:[{hex:'#00d4ff',alpha:1,pos:0},{hex:'#39ff88',alpha:.5,pos:100}]}});</script>`});
   const file=path.join(root,url.pathname);if(file.startsWith(root)&&fs.existsSync(file)&&fs.statSync(file).isFile())return route.fulfill({body:fs.readFileSync(file),contentType:file.endsWith('.css')?'text/css':/\.m?js$/.test(file)?'text/javascript':file.endsWith('.html')?'text/html':'application/json'});
   return route.fulfill({body:'{}',contentType:'application/json'});
  });
  await page.goto('http://picker.test/');
  await page.screenshot({path:`/tmp/picker-${theme}-${width}-baseline.png`});
  const baselinePixel=await page.screenshot({clip:{x:5,y:height-5,width:1,height:1}});
  await page.getByRole('button',{name:'Open picker'}).click();
  const widget=page.frameLocator('iframe.story-color-picker-frame');
  await widget.locator('.scp.open').waitFor();
  await page.screenshot({path:`/tmp/picker-${theme}-${width}-overlay.png`});
  assert.deepEqual(await page.screenshot({clip:{x:5,y:height-5,width:1,height:1}}),baselinePixel,'Outside-panel pixels must preserve the host page');
  assert.equal(await page.locator('iframe').evaluate(el=>getComputedStyle(el).colorScheme),'light only');
  assert.equal(await widget.locator('html').evaluate(el=>getComputedStyle(el).colorScheme),'light only');
  assert.equal(await page.locator('dialog.story-color-picker-surface').evaluate(el=>getComputedStyle(el).backgroundColor),'rgba(0, 0, 0, 0)');
  assert.equal(await widget.locator('body').evaluate(el=>getComputedStyle(el).backgroundColor),'rgba(0, 0, 0, 0)');
  await page.locator('dialog.story-color-picker-surface').press('Escape');
  assert.equal(await page.locator('.story-color-picker-surface').count(),0);
  await page.getByRole('button',{name:'Open picker'}).click();
  await page.getByLabel('Basic colour',{exact:true}).fill('#123456');
  assert.equal(await page.locator('.story-color-picker-surface').count(),0);
  assert.deepEqual(errors,[]);await page.close();
 }
 await browser.close();console.log('Picker canvas scheme, transparent layers, gradient open, Escape, native fallback and reopen passed in dark/light/mobile. Rendered outside-panel pixel equality passed.');
})().catch(error=>{console.error(error);process.exit(1)});
