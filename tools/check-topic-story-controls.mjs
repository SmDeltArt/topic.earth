import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { TopicStoryContentManager as Content } from '../lib/topic-story-content.mjs';
import { getTopicStoryTheme, topicStoryThemeCss } from '../lib/topic-story-theme.mjs';
import { topicStoryLabel } from '../lib/topic-story-labels.mjs';
const require=createRequire(import.meta.url);
const {DOMParser: Parser}=require(process.argv[2] || 'linkedom');
class DOMParser {
  parseFromString(text,type) {
    if (!/<html[\s>]/i.test(text)) text=`<html><head></head><body>${text.replace(/^<body>/,'').replace(/<\/body>$/,'')}</body></html>`;
    return new Parser().parseFromString(text,type);
  }
}
globalThis.DOMParser=DOMParser;
const original='<style>/* kept exactly */ .x { color: #abc; margin: 3px; }</style><article class="x" style="padding:9px"><h1>Original</h1><p>Original paragraph</p><img src="/local.png"><a href="https://example.org">Evidence</a></article>';
assert.equal(Content.editableBlocks(original).length,2);
const changed=Content.applyTextUpdates(original,[{index:1,text:'Changed <script> is plain text'}]);
assert.ok(changed.includes('<style>/* kept exactly */ .x { color: #abc; margin: 3px; }</style>'));
assert.ok(changed.includes('style="padding:9px"'));
assert.ok(changed.includes('src="/local.png"'));
assert.ok(changed.includes('href="https://example.org"'));
assert.ok(changed.includes('&lt;script&gt;'));
assert.throws(()=>Content.applyTextUpdates(original,[{index:900,text:'bad'}]));
assert.throws(()=>Content.applyTextUpdates(original,[{index:0,text:'one'},{index:0,text:'two'}]));
const styled=Content.applySettings(original,{fontSize:20,margin:6});
assert.ok(styled.includes('.x { color: #abc; margin: 3px; }'));
assert.equal((Content.applySettings(styled,{fontSize:18}).match(/id="topic-content-settings"/g)||[]).length,1);
assert.equal(Content.normalizeSettings({fontSize:100,margin:-99}).fontSize,24);
assert.equal(Content.normalizeSettings(null).fontSize,17);
assert.equal(getTopicStoryTheme({},'main').mode,'world');
for(const mode of ['world','regional','space','fever'])assert.equal(getTopicStoryTheme({},mode).mode,mode);

let source=await readFile(new URL('../components/DetailPanel.js',import.meta.url),'utf8');
source=source.replace(/^import[\s\S]*?;\r?\n/gm,'').replace('export class DetailPanel','class DetailPanel');
const document=new DOMParser().parseFromString('<html><body><div id="panel"></div></body></html>','text/html');
const realCreate=document.createElement.bind(document);
document.createElement=tag=>{const el=realCreate(tag);if(tag==='dialog'){el.showModal=()=>{el.open=true};el.close=()=>{el.open=false};}return el;};
const listeners=new Map();let historyBack=0;let calls=[];let alerts=[];
const window={matchMedia:()=>({matches:true}),history:{state:null,pushState(value){this.state=value},back(){historyBack++;this.state=null;}},addEventListener:(type,fn)=>listeners.set(type,fn),removeEventListener:(type)=>listeners.delete(type),ourEarthAI:{createChatCompletion:async request=>{calls.push(request);return {content:JSON.stringify(calls.length===1?{summary:'Review',plan:['Update paragraph'],warnings:[]}:{updates:[{index:1,text:'Updated from review'}]})};}}};
const context=vm.createContext({window,document,DOMParser,TopicStoryContentManager:Content,getTopicStoryTheme,topicStoryThemeCss,topicStoryLabel,Settings:{get:()=>({})},alert:text=>alerts.push(text),console,URL,Date});
vm.runInContext(source+'\nglobalThis.Panel=DetailPanel;',context);
const panel=Object.create(context.Panel.prototype);
panel.mode='create-topic';panel.layers=[{id:'ambassadors',color:'#39ff88',modeTabs:['regional'],icon:'🤝'}];panel.currentLayerFilter='regional';panel.topicSources=[];panel.container=document.getElementById('panel');
panel.topicFormState={title:'Pilot',summary:'Summary',category:'ambassadors',topicStory:{enabled:true,title:'Original',html:original,orientationEnabled:true,aiOrientation:'For adults; simpler language.',themeMode:'regional'}};
panel.getCurrentLanguage=()=> 'fr';panel.t=key=>topicStoryLabel(key,'fr');panel.getHostFromUrl=()=>'';
panel.saveFormState=()=>{panel.topicFormState.topicStory.updatedAt=new Date().toISOString()};
panel.renderCreateTopic=()=>{panel.container.innerHTML='<form id="topic-form">'+panel.renderTopicStoryEditor()+'</form>'};
panel.renderCreateTopic();
assert.equal(panel.container.querySelectorAll('[data-action="set-story-theme"]').length,4);
assert.ok(panel.container.querySelector('[data-action="generate-topic-story"]').hasAttribute('disabled'));
assert.ok(!panel.container.innerHTML.includes('topic.story.titlePlaceholder'));
assert.ok(panel.container.querySelector('[data-action="full-topic-story"]'));
await panel.generateTopicStoryFromAi();assert.equal(calls.length,0);assert.equal(alerts.length,1);
await panel.reviewTopicStoryFromAi();assert.ok(panel.storyReviewMatches());assert.equal(calls.length,1);
assert.equal(JSON.parse(calls[0].messages[1].content).orientation,'For adults; simpler language.');
await panel.generateTopicStoryFromAi();assert.equal(calls.length,2);
assert.ok(panel.topicFormState.topicStory.html.includes('Updated from review'));
assert.ok(panel.topicFormState.topicStory.html.includes('/* kept exactly */'));
assert.ok(!panel.storyReviewMatches());
assert.equal(panel.buildTopicStoryForSave().contentSettings.fontSize,17);
assert.equal(panel.buildTopicStoryForSave().aiOrientation,'For adults; simpler language.');
panel.openTopicStoryViewer({dataset:{storyContext:'editor'}});
assert.ok(panel.topicStoryViewer.dialog.querySelector('iframe').hasAttribute('sandbox'));
assert.equal(panel.topicStoryViewer.dialog.querySelector('iframe').getAttribute('sandbox'),'');
assert.ok(window.history.state.topicStoryView);
listeners.get('popstate')();assert.equal(panel.topicStoryViewer,null);assert.equal(historyBack,0);
panel.openTopicStoryViewer({dataset:{storyContext:'editor'}});panel.closeTopicStoryViewer();assert.equal(historyBack,1);
panel.storyAiReview={snapshot:panel.storyRequestSnapshot(),result:{summary:'Old',plan:[]}};
panel.topicFormState.topicStory.aiOrientation='Changed';assert.equal(panel.storyReviewMatches(),false);
// An edit during the asynchronous review invalidates its result.
window.ourEarthAI.createChatCompletion=async()=>{panel.topicFormState.summary='Changed during request';return {content:JSON.stringify({summary:'stale',plan:[]})};};
await panel.reviewTopicStoryFromAi();assert.equal(panel.storyAiReview,null);
console.log('Story controls: preserved CSS/layout/media, plain-text updates, review-before-generation, changed-draft rejection, four themes, persistence and modal Back/close passed.');
// A new card uses the selected mode and serialises reading preferences.
panel.topicFormState.topicStory={enabled:false,html:'',themeMode:'fever',orientationEnabled:false,aiOrientation:'Hidden instructions',contentSettings:{fontSize:19,margin:5}};
panel.topicFormState.title='New card';
let newCall=0;
window.ourEarthAI.createChatCompletion=async request=>{
  const payload=JSON.parse(request.messages[1].content);
  assert.equal(payload.orientation,'');assert.equal(payload.theme.mode,'fever');
  return {content:JSON.stringify(newCall++===0?{summary:'Create',plan:['Create card']}:{title:'New card',summary:'Readable',sections:[{label:'Action',body:'Repair together'}]})};
};
await panel.reviewTopicStoryFromAi();assert.ok(panel.storyReviewMatches());
await panel.generateTopicStoryFromAi();assert.ok(panel.topicFormState.topicStory.html.includes('Repair together'));
assert.ok(panel.topicFormState.topicStory.html.includes('#ff3030'));
assert.ok(panel.topicFormState.topicStory.html.includes('font-size:19px'));
console.log('New-card generation, inactive direction and selected Fever palette passed.');
