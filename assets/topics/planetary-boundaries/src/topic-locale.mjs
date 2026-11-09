const BASE=new URL('../translations/',import.meta.url);
const SUPPORTED=['en','fr','nl','de'];
let source=null,current=null,language='en',loadSequence=0;
const normalize=value=>String(value||'en').toLowerCase().split('-')[0];
export function preferredTopicLanguage(){
  const explicit=new URL(location.href).searchParams.get('lang');
  let inherited='en';
  try{const s=JSON.parse(localStorage.getItem('euroearth_settings')||'{}');inherited=s.translationLanguage||(s.autoDetectLanguage===false?s.uiLanguage:navigator.language)||'en';}catch{/* Isolated embedding keeps English. */}
  const code=normalize(explicit||inherited);return SUPPORTED.includes(code)?code:'en';
}
export function t(key,values={}){
  const text=current?.visualization.ui[key]??source?.visualization.ui[key]??key;
  return text.replace(/\{(\w+)\}/g,(_,name)=>String(values[name]??`{${name}}`));
}
export function term(text){
  if(language==='en')return text;
  let result=current?.visualization.terms[text];if(result)return result;
  if(!/^(?:Safe Operating Space|At planetary boundary|Zone of Increasing Risk|High-Risk Zone|Beyond boundary;|Exceeded qualitatively;)/.test(text)&&!/^([\d.,–]+|Not available) \((available|provisional|unknown)\)$/.test(text))return text;
  // Risk estimates append qualifiers; translate those phrases without changing data.
  result=String(text);for(const [from,to] of Object.entries(current?.visualization.terms??{}).sort((a,b)=>b[0].length-a[0].length))result=result.replaceAll(from,to);
  return result;
}
export function indicatorLabel(id,fallback){return current?.visualization.indicators[id]??fallback;}
export function boundaryLabel(id,fallback){return current?.visualization.boundaries[id]??fallback;}
export function getTopicLocale(){return {language,record:current};}
export function scientificText(version,key,fallback){return current?.visualization.assessmentText?.[version]?.[key]?.translation??fallback;}
export function proseText(text){return Object.values(current?.visualization.prose??{}).find(p=>p.source===text)?.translation??text;}
export async function loadTopicLocale(code=preferredTopicLanguage()){
  const request=++loadSequence,nextLanguage=SUPPORTED.includes(normalize(code))?normalize(code):'en';
  async function read(code){const r=await fetch(new URL(`${code}.json`,BASE));if(!r.ok)throw Error(`Translation unavailable: ${code}`);return r.json();}
  source??=await read('en');const record=nextLanguage==='en'?source:await read(nextLanguage);
  if(record.language!==nextLanguage||record.sourceRevision!==source.sourceRevision||!record.visualization?.ui)throw Error('Translation source revision mismatch');
  if(request!==loadSequence)return getTopicLocale();language=nextLanguage;current=record;
  return getTopicLocale();
}
export function localizePage(){
  document.documentElement.lang=language;document.title=`${t('title')} — topic.earth`;
  for(const node of document.querySelectorAll('[data-i18n]'))node.textContent=t(node.dataset.i18n);
  for(const node of document.querySelectorAll('[data-term]'))node.textContent=term(node.dataset.term);
  for(const node of document.querySelectorAll('[data-source-prose]')){node.textContent=proseText(node.dataset.sourceProse);node.lang=node.textContent===node.dataset.sourceProse?'en':language;}
  document.getElementById('topic-language').value=language;
  const note=document.getElementById('translation-note');note.hidden=language==='en';note.textContent=t('translationNote');
  document.getElementById('chart-explanation').querySelector('summary').setAttribute('aria-label',t('chartExplanation'));
}
function rootMatrix(node){let m=new DOMMatrix();for(let p=node;p&&p!==p.ownerSVGElement;p=p.parentNode){const t=p.transform?.baseVal.consolidate()?.matrix;if(t)m=new DOMMatrix([t.a,t.b,t.c,t.d,t.e,t.f]).multiply(m);}return m;}
export function localizeSvgLabels(doc,limit){
  const ns='http://www.w3.org/2000/svg',root=doc.documentElement;
  doc.getElementById('topic-localized-labels')?.remove();doc.getElementById('topic-localized-caption-arc')?.remove();
  const layer=doc.createElementNS(ns,'g');layer.id='topic-localized-labels';layer.setAttribute('pointer-events','none');
  root.append(layer);
  for(const [id,entry] of Object.entries(source.visualization.svgLabels)){
    const original=doc.getElementById(id);if(!original)continue;
    original.style.visibility='';
    if(language==='en'&&id!=='g929')continue;
    const lines=current.visualization.svgLabels[id]?.lines??entry.lines;
    if(!Array.isArray(lines)||!lines.every(s=>typeof s==='string'))continue;
    const b=original.getBBox(),m=rootMatrix(original),p=new DOMPoint(b.x,b.y).matrixTransform(m),q=new DOMPoint(b.x+b.width,b.y+b.height).matrixTransform(m);
    const x=(p.x+q.x)/2,y=(p.y+q.y)/2,w=Math.abs(q.x-p.x),h=Math.abs(q.y-p.y);
    original.style.visibility='hidden';
    const text=doc.createElementNS(ns,'text');text.id=`translation-${id}`;text.dataset.sourceLabelId=id;
    text.setAttribute('x',x);text.setAttribute('text-anchor','middle');text.setAttribute('font-family','Arial, sans-serif');
    text.setAttribute('font-weight',entry.weight??700);text.setAttribute('fill','#111');text.setAttribute('paint-order','stroke');text.setAttribute('stroke','#fff');text.setAttribute('stroke-opacity','.85');text.setAttribute('stroke-width','.45');
    let size=Math.min(7,h/Math.max(lines.length,1)*.95);if(entry.vertical)size=3.6;
    text.setAttribute('font-size',size);layer.append(text);
    lines.forEach(line=>{const span=doc.createElementNS(ns,'tspan');span.textContent=line;span.setAttribute('x',x);text.append(span);});
    const widest=Math.max(...Array.from(text.children,n=>n.getComputedTextLength()),1);
    if(!entry.vertical)size*=Math.min(1,(w*1.08)/widest);
    text.setAttribute('font-size',Math.max(2,size));
    Array.from(text.children).forEach((span,index)=>span.setAttribute('y',y+(index-(lines.length-1)/2)*size*1.18+size*.34));
    if(entry.vertical){text.setAttribute('transform',`rotate(-90 ${x} ${y})`);text.firstChild.setAttribute('y',y+size*.34);}
  }
  const caption=doc.getElementById('pb_detail_safe_operating_space_caption');caption.style.visibility=language==='en'?'':'hidden';
  if(language!=='en'){
    const path=doc.createElementNS(ns,'path'),r=limit.referenceRadius*.94,{x,y}=limit.center;path.id='topic-localized-caption-arc';path.setAttribute('d',`M ${x-r} ${y} A ${r} ${r} 0 0 1 ${x+r} ${y}`);doc.querySelector('defs').append(path);
    const text=doc.createElementNS(ns,'text');text.setAttribute('font-size','3.7');text.setAttribute('font-family','Arial, sans-serif');text.setAttribute('font-weight','700');text.setAttribute('fill','#fff');text.setAttribute('text-anchor','middle');
    const textPath=doc.createElementNS(ns,'textPath');textPath.setAttribute('href','#topic-localized-caption-arc');textPath.setAttribute('startOffset','50%');textPath.textContent=t('safeSpace');text.append(textPath);layer.append(text);
  }
  doc.getElementById('preview-high-risk-label').textContent=t('highRiskReference');doc.getElementById('preview-boundary-label').textContent=t('pbLabel');doc.querySelector('#preview-limit-guide>text').textContent=t('displayMax');
  root.setAttribute('lang',language);root.setAttribute('xml:lang',language);
  doc.getElementById('topic-earth-title').textContent=current.title;
  doc.getElementById('topic-earth-description').textContent=current.summary;
  // Labels stay above fills; the separate pointer layer remains above text.
  const interaction=doc.getElementById('preview-interaction-layer');if(interaction)interaction.before(layer);else root.append(layer);
}
