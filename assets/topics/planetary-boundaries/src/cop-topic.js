import {CONFERENCES,OBSERVATIONS,VERIFIED_AT,CALENDAR_SOURCE,progressComparison} from '../data/cop-conferences.mjs';
import {getTopicLocale} from './topic-locale.mjs';

const ns='http://www.w3.org/2000/svg';
const element=(tag,text,className)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;};
function sourceLink(source,catalog={}){const link=element('a',`${catalog.sourceNames?.[source.name]??source.name} · ${catalog.locators?.[source.locator]??source.locator}`);link.href=source.url;link.target='_blank';link.rel='noopener noreferrer';return link;}

export async function createCopTopic({getState,onSelect,onScience}){
  let conference=CONFERENCES.find(c=>c.id===new URL(location.href).searchParams.get('cop'))??CONFERENCES.at(-1);
  let record=null,sequence=0;
  const toolbar=element('div',undefined,'cop-navigation');toolbar.id='cop-toolbar';
  const conferenceLabel=element('label'),labelText=element('span'),select=element('select');select.id='cop-conference';select.setAttribute('aria-label','COP conference');
  for(const c of CONFERENCES){const option=element('option',`COP${c.number} · ${c.year} · ${c.location}`);option.value=c.id;select.append(option);}
  select.value=conference.id;conferenceLabel.append(labelText,select);
  const progressLabel=element('label'),progress=element('input'),progressText=element('span');progress.type='checkbox';progress.id='cop-progress';progressLabel.append(progress,progressText);
  progress.setAttribute('aria-describedby','cop-progress-legend');
  select.setAttribute('aria-describedby','cop-independence');
  toolbar.append(conferenceLabel,progressLabel);
  const assessmentSelect=document.getElementById('assessment-year');assessmentSelect.hidden=true;document.querySelector('label[for="assessment-year"]').hidden=true;
  assessmentSelect.before(toolbar);
  const intro=element('section',undefined,'cop-intro');intro.id='cop-content';intro.setAttribute('aria-label','Conference commitments and monitoring');
  document.getElementById('indicator-details').after(intro);
  const selectedEvidence=element('p',undefined,'note');selectedEvidence.id='cop-selected-progress';selectedEvidence.hidden=true;
  document.getElementById('selected-status').after(selectedEvidence);
  const t=key=>record.cop.ui[key];
  const localRecord=(type,value)=>({...value,...record.cop[type]?.[value.id]});
  const link=source=>sourceLink(source,record.cop);
  const number=value=>new Intl.NumberFormat(getTopicLocale().language,{maximumFractionDigits:6}).format(value);
  const unit=value=>record.cop.units?.[value]??value;
  const quantity=value=>`${number(value.value)} ${unit(value.unit)} (${record.cop.periods?.[value.period]??value.period})`;
  function render(){
    const {assessment}=getState(),language=getTopicLocale().language;
    const current=localRecord('conferences',conference);
    select.setAttribute('aria-label',t('conference'));
    for(const option of select.options){const value=CONFERENCES.find(c=>c.id===option.value);option.textContent=`COP${value.number} · ${value.year} · ${localRecord('conferences',value).location}`;}
    const heading=document.querySelector('h1');heading.removeAttribute('data-i18n');heading.textContent=record.title;document.title=record.title+' — topic.earth';
    labelText.textContent=t('conference');progressText.textContent=t('progress');intro.replaceChildren();
    const independence=element('p',t('independence'),'cop-footnote');independence.id='cop-independence';intro.append(independence);
    intro.append(link(CALENDAR_SOURCE));
    const backdrop=element('p',`${t('backdrop')}: ${assessment?.assessmentYear??'—'} · ${t('latestContext')}`,'cop-footnote');backdrop.id='cop-backdrop';intro.append(backdrop);
    intro.append(element('h2',`COP${conference.number} · ${conference.year} · ${current.location}`));
    const dates=element('p',`${t('scheduled')}: ${conference.start} → ${conference.end}${conference.adoptedOn?` · ${t('adopted')}: ${conference.adoptedOn}`:''}`);intro.append(dates);
    const status=element('p',`${conference.status==='pending'?t('pending'):t('verified')} · ${conference.checkedAt}`,'cop-status');status.id='cop-status';status.setAttribute('role','status');intro.append(status);
    const cards=element('div',undefined,'cop-grid');
    for(const key of ['agreements','commitments','implementation','gaps']){const card=element('article',undefined,'cop-card');card.dataset.evidenceType=key==='commitments'?'policy':key==='implementation'?'implementation':'context';card.append(element('h3',t(key)));const prose=element('p',current[key]);prose.lang=record.cop.conferenceProseLanguage;card.append(prose);cards.append(card);}
    intro.append(cards);
    const sources=element('nav',undefined,'cop-sources');sources.setAttribute('aria-label',t('sources'));for(const source of conference.sources)sources.append(link(source));intro.append(sources);
    const detail=element('details');detail.open=progress.checked;detail.id='cop-monitoring';detail.append(element('summary',t('monitoring')));
    const legend=element('p',t('markerLegend')+' '+t('evidenceLegend'),'cop-progress-legend');legend.id='cop-progress-legend';detail.append(legend);
    detail.append(element('p',t('insufficient'),'note'));
    for(const observation of OBSERVATIONS){
      const observed=localRecord('observations',observation);
      const result=progressComparison(observation),card=element('article',undefined,'cop-evidence');card.dataset.observationId=observation.id;card.lang=record.cop.conferenceProseLanguage;
      card.append(element('h3',observed.label));
      card.append(element('p',`${observed.scope} · ${observed.method}`));
      const values=element('p');values.id=`cop-values-${observation.id}`;
      values.textContent=`${t('previous')}: ${observation.previous?quantity(observation.previous):'—'} → ${t('latest')}: ${quantity(observation.latest)}. ${t('difference')}: ${result.comparable?`${result.difference>0?'+':''}${number(result.difference)} ${unit(observation.latest.unit)}`:t('notComparable')}.`;
      card.append(values);if(result.improved){const flag=element('strong',t('regionalProgress'));flag.lang=language;card.append(flag);}
      card.append(element('p',observed.uncertainty));card.append(link(observation.source),element('p',`${t('verified')}: ${observation.checkedAt}`,'cop-footnote'));
      const button=element('button',t('selectIndicator'));button.type='button';button.lang=language;button.addEventListener('click',()=>onSelect(observation.indicatorId));card.append(button);detail.append(card);
    }
    const note=element('p',t('translationNote'),'cop-footnote');note.lang=language;detail.append(note);intro.append(detail);
    const back=element('a',t('openMonitor'));back.href=`./index.html?lang=${language}`;intro.append(back);
    refreshSvg();
  }
  function refreshSvg(){
    const {svgDocument:doc,mode,selected}=getState();
    selectedEvidence.hidden=!progress.checked;
    selectedEvidence.textContent=t('insufficient');
    const observation=OBSERVATIONS.find(value=>value.indicatorId===selected);
    if(observation&&progressComparison(observation).improved){
      selectedEvidence.textContent=`${t('regionalProgress')}: ${number(observation.previous.value)} → ${number(observation.latest.value)} ${unit(observation.latest.unit)} (${observation.previous.year}–${observation.latest.year}); Δ ${number(progressComparison(observation).difference)} ${unit(observation.latest.unit)}. ${t('insufficient')}.`;
    }
    if(!doc)return;
    doc.getElementById('cop-progress-markers')?.remove();
    if(!progress.checked||mode!=='scientific')return;
    const layer=doc.createElementNS(ns,'g');layer.id='cop-progress-markers';layer.setAttribute('pointer-events','none');
    for(const observation of OBSERVATIONS){
      if(!progressComparison(observation).improved)continue;
      const hit=doc.getElementById(`indicator-hit-${observation.indicatorId}`);if(!hit)continue;
      const point=hit.getPointAtLength(hit.getTotalLength()*.5),marker=doc.createElementNS(ns,'g');marker.dataset.progressIndicator=observation.indicatorId;
      marker.setAttribute('role','img');marker.setAttribute('aria-label',`${localRecord('observations',observation).label}: ${number(observation.previous.value)} → ${number(observation.latest.value)} ${unit(observation.latest.unit)}. ${t('markerLegend')}`);
      const title=doc.createElementNS(ns,'title');title.textContent=marker.getAttribute('aria-label');
      const circle=doc.createElementNS(ns,'circle');for(const [name,value] of Object.entries({cx:point.x,cy:point.y,r:3.3,fill:'none',stroke:'#00a86b','stroke-width':1,'vector-effect':'non-scaling-stroke'}))circle.setAttribute(name,value);
      const arrow=doc.createElementNS(ns,'text');for(const [name,value] of Object.entries({x:point.x,y:point.y+1.25,fill:'#006b44','font-size':4,'font-family':'Arial','text-anchor':'middle'}))arrow.setAttribute(name,value);arrow.textContent='↘';
      marker.append(title,circle,arrow);layer.append(marker);
    }
    const hits=doc.getElementById('preview-interaction-layer');if(hits)hits.before(layer);else doc.documentElement.append(layer);
  }
  async function refreshLocale(){
    const request=++sequence,language=getTopicLocale().language;
    const response=await fetch(new URL(`../translations/cop-${language}.json`,import.meta.url));if(!response.ok)throw Error('COP translation unavailable');
    const value=await response.json();if(request!==sequence)return;record=value;render();
  }
  select.addEventListener('change',()=>{conference=CONFERENCES.find(c=>c.id===select.value);const url=new URL(location.href);url.searchParams.set('cop',conference.id);history.replaceState(null,'',url);render();});
  progress.addEventListener('change',()=>{if(progress.checked)onScience();render();});
  await refreshLocale();
  return {refreshSvg,refreshLocale,refresh:render,exportContext:()=>({
    topic:{id:'planetary-boundaries-cop',title:record.title,description:record.summary},translation:record,
    conference,conferenceId:conference.id,verifiedAt:VERIFIED_AT,progressEnabled:progress.checked,observations:OBSERVATIONS,
    scientificBackdropYear:getState().assessment.assessmentYear,globalBoundaryImprovementEvidence:'Insufficient comparable evidence; marker is a regional observational proxy.',
    attribution:'No COP attribution; commitments, process achievements and independent observations remain separate.'
  })};
}
