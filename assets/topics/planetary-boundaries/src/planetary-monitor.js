import { createRadialPreview, createCircleLimit } from './radial-preview.js?v=risk-gradient-20261104';
import {loadAssessment, displayValue, ratioText, thresholdDisplayRatio} from './scientific-assessments.mjs';
import {createTopicPanels} from './topic-panels.js';
import {safeSvgUrl,safeSvgDocument} from './svg-safety.mjs';
import {createTopicExport,downloadTopicExport} from './topic-export.mjs';
import {loadTopicLocale,localizePage,localizeSvgLabels,t,term,indicatorLabel,getTopicLocale,preferredTopicLanguage} from './topic-locale.mjs';
import {createSceneOverlay} from './scene-overlay.mjs';
const BASE = new URL('../', import.meta.url);
const $ = (id) => document.getElementById(id);
const clamp = (value, lo, hi) => Math.max(lo, Math.min(hi, value));
let map = [], assessment = null, svgDocument = null, selected = null;
let preview = new Map(), originalRects = new Map();
let originalViewBox = null, circleLimit = null;
let registry=null, panels=null, mode='scientific', assessmentRequest=0;
let sceneOverlay=null;
const scientificIndicator=id=>assessment?.indicators.find(i=>i.id===id);
const maxPreviewRatio = () => circleLimit?.maxRatio ?? 2;

function fitPreview() {
  if (!originalViewBox) return;
  let { x, y, right, bottom } = originalViewBox;
  if (circleLimit) {
    const bounds = circleLimit.bounds;
    x = Math.min(x,bounds.x); y = Math.min(y,bounds.y);
    right = Math.max(right,bounds.right); bottom = Math.max(bottom,bounds.bottom);
  }
  svgDocument.documentElement.setAttribute('viewBox', `${x} ${y} ${right-x} ${bottom-y}`);
}

function setStatus(message) { $('message').textContent = message; }
function statusFor(id) {
  return assessment?.boundaries.find(x => x.id === id)?.status || 'unknown';
}
function renderSidebar() {
  const target = $('indicator-list'),focused=document.activeElement?.dataset.indicatorId,scrollTop=target.scrollTop;
  target.replaceChildren();
  for (const entry of map) {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'indicator-item';
    button.dataset.indicatorId=entry.id;
    const number=document.createElement('span');number.className='indicator-number';number.textContent=String(map.indexOf(entry)+1).padStart(2,'0');
    const name = document.createElement('span');name.className='indicator-name';name.textContent=indicatorLabel(entry.id,scientificIndicator(entry.id).label);
    const value = document.createElement('small');
    const ratio = preview.get(entry.id);
    value.textContent = mode==='scientific' ? `q ${ratioText(scientificIndicator(entry.id))}` : ratio === undefined ? 'Artwork / unquantified' : `Preview ${Math.round(ratio*100)}%`;
    button.append(number,name, value);
    button.classList.toggle('active', selected === entry.id);
    button.setAttribute('aria-pressed',String(selected===entry.id));
    button.addEventListener('click', () => select(entry.id));
    button.addEventListener('pointerenter',()=>hoverIndicator(entry.id,true));
    button.addEventListener('pointerleave',()=>hoverIndicator(entry.id,false));
    target.append(button);
    if(focused===entry.id)button.focus({preventScroll:true});
  }
  target.scrollTop=scrollTop;
}
function hoverIndicator(id,active){
  for(const entry of map){
    $('indicator-list').querySelector(`[data-indicator-id="${entry.id}"]`)?.classList.toggle('hovered',active&&entry.id===id);
    svgDocument?.getElementById(`indicator-hit-${entry.id}`)?.setAttribute('data-hovered',String(active&&entry.id===id));
  }
}
function select(id,origin='list') {
  const item = map.find(i => i.id === id); if (!item) return;
  selected = id;
  $('selected-name').textContent = indicatorLabel(id,scientificIndicator(id).label);
  $('chart-selected').textContent=`${String(map.indexOf(item)+1).padStart(2,'0')} · ${$('selected-name').textContent}`;
  const official = statusFor(item.boundary);
  $('selected-status').textContent = term(official === 'exceeded' ? 'Official boundary status: exceeded' : official === 'not_exceeded_globally' ? 'Official boundary status: not exceeded globally' : 'Official status: unknown');
  const val = preview.get(id);
  const displayedPercent=Math.round(clamp(val??0,0,maxPreviewRatio())*100);
  $('ratio').value = String(displayedPercent);
  $('ratio-number').value = String(displayedPercent);
  $('preview-value').textContent = mode==='scientific' ? t('scientificValue',{value:ratioText(scientificIndicator(id))}) : val === undefined ? t('artworkValue') : t('previewValue',{value:(val*100).toFixed(0)});
  const indicator=scientificIndicator(id), upper=indicator.normalizedValue?.max??displayValue(indicator);
  panels?.details(indicator,mode,upper!==null&&thresholdDisplayRatio(indicator,upper)>maxPreviewRatio());
  renderSidebar();
  if(origin==='svg'){
    panels?.activateStatus();
    const list=$('indicator-list'),button=list.querySelector(`[data-indicator-id="${id}"]`);
    if(button){const b=button.getBoundingClientRect(),l=list.getBoundingClientRect();if(b.top<l.top)list.scrollTop-=l.top-b.top;if(b.bottom>l.bottom)list.scrollTop+=b.bottom-l.bottom;}
  }
  if (svgDocument) {
    for (const entry of map) {
      const group = svgDocument.getElementById(entry.svgGroupId);
      if (group) { group.style.opacity = entry.id === id ? '1' : '0.86'; group.style.cursor = 'pointer'; }
      const shape = svgDocument.getElementById(`preview-group-${entry.id}`);
      svgDocument.getElementById(`indicator-hit-${entry.id}`)?.setAttribute('data-selected',String(entry.id===id));
      if (shape) {
        shape.setAttribute('aria-label',`${indicatorLabel(entry.id,scientificIndicator(entry.id).label)} · ${mode==='scientific'?term(ratioText(scientificIndicator(entry.id))):t('manualMode')}`);
        shape.style.opacity='1';shape.style.stroke=entry.id===id?'#fff':'';
        shape.style.strokeWidth=entry.id===id?'1.5px':'';
        shape.setAttribute('vector-effect','non-scaling-stroke');shape.setAttribute('aria-pressed',String(entry.id===id));
      }
    }
  }
}
function applyRatio(id, value, scientific=false) {
  const entry = map.find(i => i.id === id); if (!entry) return;
  const ratio = scientific ? Number(value) : clamp(Number(value), 0, maxPreviewRatio());
  if (!Number.isFinite(ratio)) return;
  if(!scientific) mode='illustrative';
  preview.set(id, ratio);
  if (svgDocument) {
    const rect = svgDocument.getElementById(entry.svgRectId);
    const base = originalRects.get(id);
    if (rect && base) {
      const indicator=scientificIndicator(id), q=indicator.normalizedValue;
      base.geometry.apply(scientific ? thresholdDisplayRatio(indicator,ratio) : ratio);
      const displayUncertainty=scientific&&q ? {...q,...(q.min!==undefined?{min:thresholdDisplayRatio(indicator,q.min)}:{}),...(q.max!==undefined?{max:thresholdDisplayRatio(indicator,q.max)}:{})} : null;
      base.geometry.uncertainty(displayUncertainty);
      const shape=svgDocument.getElementById(`preview-group-${id}`);
      if(shape){shape.dataset.scientificRatio=scientific?String(ratio):'';shape.dataset.scientificClipped=String(scientific && thresholdDisplayRatio(indicator,q?.max??ratio)>maxPreviewRatio());shape.setAttribute('aria-label',`${indicator.label}: ${scientific?`assessment ratio ${ratioText(indicator)}`:`illustrative ${ratio}`}`);}
      const group = svgDocument.getElementById(entry.svgGroupId);
      if (group) {
        group.dataset.previewRatio = String(ratio);
        group.dataset.previewOverflow = String(Math.max(0, ratio - 1));
      }
    }
  }
  fitPreview();
  if (selected === id) select(id); else renderSidebar();
  $('preview-notice').hidden = mode === 'scientific';
  if(!scientific)setStatus(t('manualStatus'));
}
function showScience() {
  mode='scientific';preview.clear();
  for(const entry of map){
    const i=scientificIndicator(entry.id),value=displayValue(i),base=originalRects.get(entry.id);
    if(value!==null) applyRatio(entry.id,value,true);
    else if(base){base.geometry.unquantified();const group=svgDocument.getElementById(entry.svgGroupId);delete group.dataset.previewRatio;delete group.dataset.previewOverflow;}
  }
  select(selected);setStatus(t('svgLoaded',{count:originalRects.size,total:map.length}));
}
async function switchAssessment(year){
  const item=registry.assessments.find(a=>a.year===year);if(!item)return;
  const request=++assessmentRequest;
  try{
    const data=await loadAssessment(new URL(`data/${item.file}`,BASE),map.map(i=>i.id),item.sha256);
    if(request!==assessmentRequest)return;
    assessment=data;panels.render(data);localizePage();if(svgDocument)showScience();
  }catch(error){$('assessment-year').value=assessment?.assessmentYear??registry.latest;setStatus(error.message);if(!assessment)throw error;}
}
function connectSvg(inlineDocument=null) {
  try {
    const obj = $('chart'); svgDocument = inlineDocument?.documentElement ? inlineDocument : obj.contentDocument;
    if (!svgDocument?.documentElement) throw new Error('SVG document unavailable');
    svgDocument.documentElement.setAttribute('role','group');
    const box = svgDocument.documentElement.viewBox.baseVal;
    originalViewBox = { x:box.x, y:box.y, right:box.x+box.width, bottom:box.y+box.height };
    circleLimit = createCircleLimit(svgDocument);
    const maximumPercent=Math.ceil(maxPreviewRatio()*100);
    $('ratio').max=String(maximumPercent);
    $('ratio-number').max=String(maximumPercent);
    $('ratio-label').textContent=t('ratioLabel',{max:maximumPercent});
    originalRects.clear();
    for (const entry of map) {
      const rect = svgDocument.getElementById(entry.svgRectId);
      const group = svgDocument.getElementById(entry.svgGroupId);
      if (!rect || !group) { setStatus('Some semantic SVG elements could not be located.'); continue; }
      originalRects.set(entry.id, { geometry: createRadialPreview(svgDocument, entry, rect, () => select(entry.id,'svg'), circleLimit) });
      group.style.cursor = 'pointer';
      group.addEventListener('click', (event) => { event.preventDefault(); select(entry.id); });
    }
    svgDocument.addEventListener('topic-indicator-hover',event=>hoverIndicator(event.detail.id,event.detail.active));
    localizeSvgLabels(svgDocument,circleLimit);
    fitPreview();
    showScience();
    select(selected || map[0]?.id);
    sceneOverlay=createSceneOverlay({doc:svgDocument,limit:circleLimit,map,onScientific:showScience,onFever:context=>{
      mode='fever-illustration';
      for(const entry of map){
        const value=context.progress[entry.boundary],base=originalRects.get(entry.id);if(!base)continue;
        if(Number.isFinite(value)){
          base.geometry.apply(value*maxPreviewRatio());base.geometry.uncertainty(null);
          const shape=svgDocument.getElementById(`preview-group-${entry.id}`);shape.dataset.scientificRatio='';shape.dataset.feverIndex=String(value);
        }else base.geometry.unquantified();
      }
    }});
    setStatus(t('svgLoaded',{count:originalRects.size,total:map.length}));
  } catch (error) {
    setStatus(`Unable to control SVG: ${error.message}. Run via a local HTTP server, not a restricted file viewer.`);
  }
}
function setupEvents() {
  $('chart').addEventListener('load', connectSvg);
  $('ratio').addEventListener('input', e => { $('ratio-number').value = e.target.value; if (selected) applyRatio(selected, Number(e.target.value) / 100); });
  $('ratio-number').addEventListener('input', e => { const raw = Number(e.target.value); if (!Number.isFinite(raw)) return; const v=clamp(raw,0,Number($('ratio-number').max)); $('ratio').value=String(v); if(selected) applyRatio(selected,v/100); });
  $('clear-preview').addEventListener('click', () => {
    mode='artwork';
    preview.clear();
    for (const entry of map) {
      const rect = svgDocument?.getElementById(entry.svgRectId); const base=originalRects.get(entry.id);
      if (rect && base) base.geometry.restore();
      const group=svgDocument?.getElementById(entry.svgGroupId);
      if (group) { group.style.filter=''; delete group.dataset.previewOverflow; delete group.dataset.previewRatio; }
    }
    fitPreview();
    $('preview-notice').hidden=false; select(selected); setStatus(t('artworkStatus'));
  });
  $('demo-preview').addEventListener('click', () => {
    for (const [index, entry] of map.entries()) applyRatio(entry.id, maxPreviewRatio()*(0.25+0.75*index/(map.length-1)));
    setStatus(t('manualStatus'));
  });
  $('export-download').addEventListener('click',()=>{
    try{
      if(!svgDocument||!circleLimit)throw Error('Chart not ready');
      const {language,record:translation}=getTopicLocale();
      const bundle=createTopicExport({assessment,map,svgDocument,mode,selected,language,translation,limit:circleLimit});
      downloadTopicExport(bundle,$('export-format').value);setStatus(t('exported'));
    }catch(error){setStatus(`Export failed: ${error.message}`);}
  });
  $('topic-language').addEventListener('change',async event=>{
    const code=event.target.value,url=new URL(location.href);url.searchParams.set('lang',code);history.replaceState(null,'',url);
    await refreshLanguage(code);
  });
  const followSettings=()=>{if(!new URL(location.href).searchParams.has('lang'))refreshLanguage(preferredTopicLanguage());};
  window.addEventListener('storage',event=>{if(event.key==='euroearth_settings')followSettings();});
  try{if(window.parent!==window){window.parent.addEventListener('settingsChanged',followSettings);window.addEventListener('pagehide',()=>window.parent.removeEventListener('settingsChanged',followSettings),{once:true});}}catch{/* Cross-origin embeds use explicit lang URLs. */}

}
async function refreshLanguage(code){
  try{
    await loadTopicLocale(code);localizePage();
    if(assessment)panels.render(assessment);
    localizePage();if(svgDocument)localizeSvgLabels(svgDocument,circleLimit);sceneOverlay?.refresh();
    if(selected)select(selected);
    if(circleLimit)$('ratio-label').textContent=t('ratioLabel',{max:Math.ceil(maxPreviewRatio()*100)});
    if(mode!=='scientific')setStatus(t(mode==='artwork'?'artworkStatus':'manualStatus'));
  }catch(error){setStatus(`Translation failed: ${error.message}`);}
}
async function init() {
  setupEvents();
  try {
    await loadTopicLocale();localizePage();
    const [m,r]=await Promise.all([
      fetch(new URL('data/indicator-map.json',BASE)).then(r=>{if(!r.ok)throw Error('Indicator map unavailable');return r.json();}),
      fetch(new URL('data/assessment-registry.json',BASE)).then(r=>{if(!r.ok)throw Error('Assessment registry unavailable');return r.json();})
    ]);
    map=m;registry=r;
    panels=createTopicPanels({registry,onAssessment:switchAssessment,onSelect:select,onScience:showScience});
    await switchAssessment(registry.latest);
    if(!assessment)throw Error('No validated assessment available');
    selected=map[0]?.id;
    renderSidebar();select(selected);
    // Assign SVG path only after data is loaded, so its load handler has the indicator map.
    const artworkUrl=new URL('assets/planetary-boundaries.svg',BASE);
    if(new URL(location.href).searchParams.get('overlay')==='1'){
      // Embedded scene viewers may restrict object/blob navigation. Keep the
      // validated artwork in a real layout tree for SVG bounds and transforms.
      const parsed=await safeSvgDocument(artworkUrl),root=document.importNode(parsed.documentElement,true);
      const host=document.createElement('div');host.id='scene-controller-artwork';host.append(root);$('chart').after(host);
      const scoped={documentElement:root,getElementById:id=>root.querySelector('#'+CSS.escape(id)),querySelector:s=>root.querySelector(s),createElementNS:(...args)=>document.createElementNS(...args),addEventListener:(...args)=>root.addEventListener(...args),dispatchEvent:e=>root.dispatchEvent(e)};
      connectSvg(scoped);
    }else{
      const svgUrl=await safeSvgUrl(artworkUrl);$('chart').data=svgUrl;
      window.addEventListener('pagehide',()=>URL.revokeObjectURL(svgUrl),{once:true});
    }
    setStatus(`Loaded verified source assessment ${assessment.assessmentYear}.`);
  } catch(err) {setStatus(`Initialization failed: ${err.message}. Serve this directory over HTTP (see README).`);}
}
init();
