import {numberText as formatNumber, quantityText as formatQuantity, ratioText as formatRatio, riskZone} from './scientific-assessments.mjs';
import {t,term,indicatorLabel,boundaryLabel,scientificText,proseText,getTopicLocale} from './topic-locale.mjs';
const numberText=value=>formatNumber(value,getTopicLocale().language);
const quantityText=value=>formatQuantity(value,getTopicLocale().language);
const ratioText=value=>formatRatio(value,getTopicLocale().language);
const $=id=>document.getElementById(id);
const el=(tag,text,className)=>{const n=document.createElement(tag);if(text!==undefined){n.textContent=typeof text==='string'?term(text):text;if(typeof text==='string'&&text.length<150)n.dataset.term=text;}if(className)n.className=className;return n;};
const HANPP_ID='biosphere_integrity__functional_diversity';
function link(text,url) {const a=el('a',text);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;}
function table(headers,rows,caption) {
  const wrap=el('div',undefined,'table-scroll');wrap.tabIndex=0;wrap.setAttribute('role','region');wrap.setAttribute('aria-label',caption);
  const t=el('table'),head=el('thead'),tr=el('tr');t.append(el('caption',caption));
  for(const text of headers){const th=el('th',text);th.scope='col';tr.append(th);}head.append(tr);t.append(head);
  const body=el('tbody');for(const cells of rows){const row=el('tr');for(const value of cells){const cell=el('td');cell.append(value instanceof Node?value:el('span',String(value)));row.append(cell);}body.append(row);}t.append(body);wrap.append(t);return wrap;
}
function paragraph(parent,text,className) {const p=el('p',proseText(text),className);p.dataset.sourceProse=text;parent.append(p);}
function hanppContext(indicator) {
  const observed=quantityText(indicator.observed);
  const ratio=ratioText(indicator);
  const observation=indicator.observationPeriod
    ? `observation period ${indicator.observationPeriod}`
    : `observation year ${numberText(indicator.observationYear)}`;
  const context=`${indicator.assessmentYear} assessment · ${observation} · observed HANPP ${observed}% of preindustrial NPP · project-derived normalized ratio q ${ratio}.`;
  if(indicator.observed.kind==='range'){
    return `${context} The filled wedge ends at the lower endpoint (${numberText(indicator.observed.min)}%; q ${numberText(indicator.normalizedValue.min)}); the dashed edge marks the upper endpoint (${numberText(indicator.observed.max)}%; q ${numberText(indicator.normalizedValue.max)}). This range represents distinct source estimates and methodological uncertainty, not a measured improvement from the 30% values reported in earlier assessments.`;
  }
  return `${context} Comparisons across assessment years use each report's published reference and observation metadata; a different q does not by itself show measured environmental improvement.`;
}
export function createTopicPanels({registry,onAssessment,onSelect,onScience}) {
  let activeVersion=null;
  const tabs=[...document.querySelectorAll('[role=tab]')];
  function activate(tab,focus=false) {
    for(const button of tabs){const active=button===tab;button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;$(button.getAttribute('aria-controls')).hidden=!active;}
    if(focus)tab.focus();
  }
  tabs.forEach((tab,index)=>{
    tab.addEventListener('click',()=>activate(tab));
    tab.addEventListener('keydown',event=>{
      const next=event.key==='ArrowRight'?(index+1)%tabs.length:event.key==='ArrowLeft'?(index+tabs.length-1)%tabs.length:event.key==='Home'?0:event.key==='End'?tabs.length-1:null;
      if(next!==null){event.preventDefault();activate(tabs[next],true);}
    });
  });
  const history=$('history-content');
  for(const item of registry.assessments){
    const option=el('option',String(item.year));option.value=item.year;$('assessment-year').append(option);
    const button=el('button',t('loadReport',{label:item.label}),'action');button.type='button';button.dataset.assessmentYear=item.year;
    button.addEventListener('click',()=>onAssessment(item.year));history.append(button);
  }
  $('assessment-year').value=registry.latest;
  $('assessment-year').addEventListener('change',event=>onAssessment(Number(event.target.value)));
  $('return-science').addEventListener('click',onScience);
  const education=$('education-content');
  education.append(el('h2','Why do all boundaries share a 100% reference?'));
  paragraph(education,'Nine Earth system processes use different physical and ecological measurements. Their 13 indicator channels cannot be compared in raw units. A boundary-relative value of 1.0 (100%) marks each variable’s own precautionary boundary, not maximum disturbance, equal harm or equal risk severity.');
  paragraph(education,'The green Safe Operating Space is bounded by the green/yellow transition. Exceedance increases concern about Earth system stability; it does not identify a precise tipping point or guarantee immediate collapse. A tipping point is a threshold for self-reinforcing system change; precautionary planetary boundaries aim to reduce the chance of reaching such thresholds.');
  education.append(table(['Illustrative ratio','Meaning'],[[.50,'Below the boundary'],[.90,'Approaching the boundary'],[1,'At the boundary'],[1.50,'Beyond the boundary'],[3,'Far beyond the boundary']],'Examples only — not environmental observations'));
  paragraph(education,'Yellow, orange and red are a continuous visual guide. This shared palette is not a universal quantitative risk scale: each variable has its own upper-risk threshold, and some thresholds are unknown. Global unexceeded status does not imply that every region is safe. The boundaries interact; the diagram is not a sum of independent damage scores.');
  const method=$('methodology-content');
  method.append(el('h2','From observations to a display radius'));
  paragraph(method,'Raw observation → publication-specific reference and boundary → project-derived ratio q = (observed − reference) / (boundary − reference). Lower-is-worse variables (forest, ocean and ozone) have a negative denominator. Zero-boundary novel entities remain unquantified: no division by zero. Ranges stay ranges; no midpoint is invented.');
  paragraph(method,'Scientific display now aligns both thresholds: h = (high-risk − reference) / (boundary − reference). For q ≤ 1, display distance d=q. Above the boundary, d=1+(q−1)/(h−1). Radius=green-circle radius × max(0,d). Thus q=1 stays at the green ring, and each indicator’s own h maps to the orange ring. Its radius of twice the green radius is a visual choice, not a universal scientific ratio of 200%. Extrapolation beyond h reaches the purple region and is capped only at the display edge. If h is unknown, no high-risk classification is inferred and a known q uses the legacy linear display with an explicit unknown-threshold warning.');
  paragraph(method,'This explicitly documented project normalization uses the selected report’s anchors; it is not a published universal risk score. For zero-reference variables q reduces to observed/boundary. The scientific display has changed explicitly to threshold alignment; manual illustration retains the original controller’s linear radial transform. Richardson et al. (2023), Fig. 1 uses logarithmic wedge lengths and explicitly excepts freshwater from common-radius normalization. This adaptation aligns freshwater using its own reference, boundary and high-risk threshold. It does not reproduce the paper’s wedge distances.');
  paragraph(method,'Freshwater values describe land area with wet or dry streamflow / soil-moisture departures from preindustrial variability, not water withdrawals. In 2023, the baseline is a preindustrial median and the boundary a 95th percentile. Subtracting the reference therefore matters. Later report revisions must not be interpreted as a continuous annual observation series.');
  paragraph(method,'The outer circle is a visual cap only. Exact scientific ratios stay in the table and export even when a wedge is clipped. Range estimates show a lower filled extent and dashed upper extent. One-sided estimates have a dashed edge. Unquantified indicators have no quantitative fill and remain selectable in the indicator list. Manual controls enter a clearly marked illustrative mode and never modify the assessment JSON. Restored source artwork is also illustrative.');
  method.append(el('h3','Scientific sources and attribution'));
  const sources=el('ul');for(const [text,url] of [
    ['Richardson et al. (2023) · Science Advances · 13 September 2023 · DOI 10.1126/sciadv.adh2458','https://doi.org/10.1126/sciadv.adh2458'],
    ['Steffen et al. (2015) · planetary boundary and zone of increasing risk · DOI 10.1126/science.1259855','https://doi.org/10.1126/science.1259855'],
    ['Planetary Boundaries Science / PIK · annual Planetary Health Check reports','https://www.planetaryhealthcheck.org/'],
    ['Official reports, figures and licensing','https://www.planetaryhealthcheck.org/downloads/'],
    ['Stockholm Resilience Centre · planetary boundaries framework','https://www.stockholmresilience.org/research/planetary-boundaries.html'],
    ['Globaïa · two normalization conventions for the same data','https://globaia.org/boundaries/']]){const li=el('li');li.append(link(text,url));sources.append(li);}method.append(sources);
  paragraph(method,'PHC assessments combine observations, remote sensing, statistical integration, hydrological and climate models, and expert synthesis. Publication year is not observation year. “Not available” means a single observation year or quantity has not been verified here; available dataset periods are listed separately. This is a dated source transcription, not live monitoring or an independent scientific review.');
  paragraph(method,'PHC figures: credit Planetary Boundaries Science (PBScience), assessment year; CC BY 4.0 unless otherwise stated. Report art credits include Globaïa. Richardson article: CC BY-NC 4.0; consult the original license for artwork reuse. The supplied SVG’s original artwork provenance/license is not established here. Visualization adaptation: Benoît Descy, topic.earth. Scientific research and third-party artwork remain attributed to their creators; no endorsement or exclusive ownership is claimed.');
  method.append(link('topic.earth','https://www.topic.earth/'));
  method.append(el('h3','Updates and Master Admin review'));
  paragraph(method,'Latest verified assessment: 2026. Sources checked 4 November 2026. Reports are normally annual; no automatic polling or privileged publishing runs in this page. A source registry supports a future server-side watcher → candidate extraction → schema and scientific review → Master Admin approval → new immutable version. AI can assist extraction but cannot approve scientific changes. Credentials and authorization belong on the server. This topic remains independent of Earth’s Fever.');
  function render(assessment) {
    activeVersion=assessment.version;
    $('assessment-year').value=assessment.assessmentYear;
    $('report-date').textContent=assessment.publicationDate??t('publicationUnknown',{year:assessment.assessmentYear});
    $('official-source').href=assessment.source.url;
    $('headline').textContent=t('headline',{count:assessment.boundaries.filter(b=>b.status==='exceeded').length,year:assessment.assessmentYear});
    $('freshness').textContent=t('freshness',{date:assessment.checkedAt});
    $('history-note').textContent=`${t('selectedVersion',{version:assessment.version})} ${scientificText(activeVersion,'methodologyNotes',assessment.methodologyNotes)}`;
    for(const item of registry.assessments){const button=history.querySelector(`[data-assessment-year="${item.year}"]`);button.textContent=t('loadReport',{label:item.label});delete button.dataset.term;}
    document.querySelectorAll('[data-assessment-year]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.assessmentYear)===assessment.assessmentYear)));
    const data=$('data-content');data.replaceChildren(el('h2',t('scientificDataTitle',{year:assessment.assessmentYear})));
    paragraph(data,scientificText(activeVersion,'normalizationNote',assessment.normalizationNote),'note');
    const rows=assessment.indicators.map(i=>{
      const choose=el('button',indicatorLabel(i.id,i.label),'data-select');choose.type='button';choose.dataset.indicatorId=i.id;
      choose.addEventListener('click',()=>{onSelect(i.id);activate(tabs[0]);$('selected-name').scrollIntoView({block:'nearest'});});
      return [boundaryLabel(i.boundaryId,i.boundaryId.replaceAll('_',' ')),choose,quantityText(i.observed),i.unit,numberText(i.referenceValue),`${i.boundaryComparator} ${numberText(i.boundaryValue)}`,numberText(i.upperRiskThreshold),i.thresholdAvailability,ratioText(i),riskZone(i),assessment.assessmentYear,numberText(i.observationYear),i.observationPeriod??'Not available',`${term(i.validationStatus.replaceAll('_',' '))} · ${term(i.observed.kind.replaceAll('_',' '))}`,link(i.source.locator,i.source.url)];
    });
    data.append(table(['Boundary','Control variable / select','Observed source value','Unit','Reference','PB','High risk','Threshold availability','Project-derived normalized ratio q','Risk zone','Assessment year','Observation year','Observation period','Data status','Scientific source'],rows,'Verified source values — scroll horizontally for all fields'));
    data.append(el('h3','Additional phosphorus criterion'));
    for(const p of assessment.additionalMeasurements)paragraph(data,`${t('additionalP',{label:term(p.label),value:p.observedValue,unit:term(p.unit),reference:p.referenceValue,boundary:p.boundaryValue,highRisk:p.upperRiskThreshold})} ${t('additionalPNote')}`);
    const old=$('units-table');if(old)old.remove();
    const units=table(['Boundary','Control variable','Unit'],assessment.indicators.map(i=>[boundaryLabel(i.boundaryId,i.boundaryId.replaceAll('_',' ')),indicatorLabel(i.id,i.label),i.unit]),'Scientific units · selected assessment');units.id='units-table';education.append(units);
    $('selected-source').replaceChildren(link(assessment.source.name,assessment.source.url));
  }
  function details(indicator,mode,clipped) {
    const grid=el('dl',undefined,'detail-grid');
    const observedLabel=indicator.id===HANPP_ID?'Observed HANPP':'Observed source value';
    const observedValue=indicator.id===HANPP_ID?`${quantityText(indicator.observed)}% of preindustrial NPP`:`${term(quantityText(indicator.observed))} ${term(indicator.unit)}`;
    for(const [name,value] of [[observedLabel,observedValue],['Reference',numberText(indicator.referenceValue)],['Planetary boundary',`${indicator.boundaryComparator} ${numberText(indicator.boundaryValue)} ${term(indicator.unit)}`],['High-risk threshold',`${numberText(indicator.upperRiskThreshold)} (${indicator.thresholdAvailability})`],['Project-derived normalized ratio q',ratioText(indicator)],['Risk zone',riskZone(indicator)],['Assessment year',indicator.assessmentYear],['Observation year',numberText(indicator.observationYear)],['Observation period',indicator.observationPeriod??'Not available']]){
      const field=el('div');field.append(el('dt',name),el('dd',value));grid.append(field);
    }
    const content=[grid];
    if(indicator.id===HANPP_ID)content.push(el('p',hanppContext(indicator),'note hanpp-context'));
    $('scientific-detail').replaceChildren(...content);
    $('uncertainty').textContent=`${scientificText(activeVersion,`indicators.${indicator.id}.uncertainty`,indicator.uncertainty)}${clipped?' '+t('clippedWarning'):''}`;
    $('view-mode').textContent=t(mode==='scientific'?'scientificMode':mode==='artwork'?'artworkMode':'manualMode');
    $('preview-notice').hidden=mode==='scientific';
  }
  return {render,details,activateStatus:()=>activate(tabs[0])};
}
