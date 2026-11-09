// Scientific quantities are independent of the SVG. These are project-derived
// boundary-relative ratios, not published universal risk scores or figure radii.
export const NORMALIZATION = 'reference-relative-v1';
export const numberText = (value,locale='en') => value === null || value === undefined ? 'Not available' :
  typeof value === 'number' ? new Intl.NumberFormat(locale, {maximumFractionDigits: 3}).format(value) : String(value);
export function normalized(indicator) {
  const {observed, referenceValue: reference, boundaryValue: boundary} = indicator;
  if (indicator.normalizationMethod === 'unquantified') return null;
  if (![reference, boundary].every(Number.isFinite) || boundary === reference) throw Error('Invalid normalization anchors');
  const transform = value => value===reference ? 0 : (value - reference) / (boundary - reference);
  if (observed.kind === 'point') return {kind:'point', value:transform(observed.value)};
  if (observed.kind === 'range') {
    const values=[transform(observed.min),transform(observed.max)].sort((a,b)=>a-b);
    return {kind:'range', min:values[0], max:values[1]};
  }
  if (observed.kind === 'lower_bound' && boundary > reference) return {kind:'lower_bound', min:transform(observed.min)};
  return null;
}
export function quantityText(value,locale='en') {
  if (!value || value.kind === 'unavailable') return 'Not available';
  if (value.kind === 'qualitative') return value.text;
  if (value.kind === 'range') return `${numberText(value.min,locale)}–${numberText(value.max,locale)}`;
  if (value.kind === 'lower_bound') return `>${numberText(value.min,locale)}`;
  return numberText(value.value,locale);
}
export function ratioText(indicator,locale='en') { return quantityText(indicator.normalizedValue,locale); }
export function displayValue(indicator) {
  const ratio=indicator.normalizedValue;
  // Ranges and one-sided estimates keep their endpoints; never use a midpoint.
  return ratio?.kind === 'point' ? ratio.value : ratio?.min ?? null;
}
export function highRiskRatio(indicator){
  if(!Number.isFinite(indicator.upperRiskThreshold) || indicator.normalizationMethod==='unquantified')return null;
  const q=normalized({...indicator,observed:{kind:'point',value:indicator.upperRiskThreshold}})?.value;
  return Number.isFinite(q)&&q>1 ? q : null;
}
// Display coordinate 2 is a chosen radius, never a universal scientific ratio.
export function thresholdDisplayRatio(indicator,q){
  const h=highRiskRatio(indicator);
  return q<=1||h===null ? q : 1+(q-1)/(h-1);
}
export function riskZone(indicator){
  const q=indicator.normalizedValue,h=highRiskRatio(indicator);
  if(!q)return 'Exceeded qualitatively; high-risk threshold unknown';
  const classify=v=>v<1?'Safe Operating Space':v===1?'At planetary boundary':h===null?'Beyond boundary; high-risk threshold unknown':v>=h?'High-Risk Zone':'Zone of Increasing Risk';
  if(q.kind==='point')return classify(q.value);
  if(q.kind==='lower_bound')return `${classify(q.min)} (one-sided estimate)`;
  const low=classify(q.min),high=classify(q.max);return low===high?`${low} (range estimate)`:`${low} → ${high} (range estimate)`;
}
export function validateAssessment(data, ids) {
  const fail = message => { throw Error(`Assessment rejected: ${message}`); };
  if (data.schemaVersion !== 1 || data.type !== 'validated_scientific_assessment' || !Number.isInteger(data.assessmentYear)) fail('schema');
  if (!Array.isArray(data.indicators) || data.indicators.length !== 13 || new Set(data.indicators.map(i=>i.id)).size !== 13) fail('13 unique indicators required');
  if (ids && data.indicators.some(i=>!ids.includes(i.id))) fail('unknown indicator');
  if (data.boundaries?.length !== 9 || new Set(data.boundaries.map(i=>i.id)).size !== 9) fail('9 unique boundaries required');
  if (!data.boundaries.every(b=>['exceeded','not_exceeded_globally'].includes(b.status))) fail('boundary classification');
  const safeUrl = value => { try { return new URL(value).protocol === 'https:'; } catch { return false; } };
  if (!safeUrl(data.source?.url) || !data.source.locator || !data.version || !data.methodologyNotes) fail('provenance');
  for (const i of data.indicators) {
    if (!data.boundaries.some(b=>b.id===i.boundaryId) || !i.label || !i.definition || !i.unit || !i.uncertainty || !i.source?.locator || !safeUrl(i.source.url)) fail('indicator provenance');
    if (i.assessmentYear !== data.assessmentYear || i.publicationDate !== data.publicationDate || i.validationStatus !== 'source_checked') fail('mixed assessment');
    if (!['linear-radius-v1','pb-high-risk-aligned-v1'].includes(i.displayTransformation) || ![NORMALIZATION,'unquantified'].includes(i.normalizationMethod)) fail('unknown method');
    if(!['available','provisional','unknown'].includes(i.thresholdAvailability))fail('threshold availability');
    if((i.thresholdAvailability==='unknown')!==(i.upperRiskThreshold===null))fail('inconsistent threshold availability');
    const o=i.observed;
    if (!o || !['point','range','lower_bound','qualitative','unavailable'].includes(o.kind)) fail('observation kind');
    const keys=o.kind==='point'?['value']:o.kind==='range'?['min','max']:o.kind==='lower_bound'?['min']:[];
    if (keys.some(k=>!Number.isFinite(o[k]) || o[k]<0) || (o.kind==='range' && o.min>o.max)) fail('observation value');
    for (const k of ['referenceValue','boundaryValue','upperRiskThreshold']) if (i[k] !== null && !Number.isFinite(i[k])) fail('nonfinite anchor');
    if (i.normalizationMethod==='unquantified' && i.normalizedValue !== null) fail('unquantified ratio');
    if (i.normalizationMethod!== 'unquantified' && (i.boundaryValue===null || i.referenceValue===null)) fail('missing anchor');
    if(i.upperRiskThreshold!==null && highRiskRatio(i)===null)fail('high-risk threshold is not beyond PB');
    if (JSON.stringify(normalized(i)) !== JSON.stringify(i.normalizedValue)) fail(`derived ratio mismatch: ${i.id}`);
  }
  return data;
}
export function freezeAssessment(data) {
  if (data && typeof data === 'object' && !Object.isFrozen(data)) {
    Object.values(data).forEach(freezeAssessment); Object.freeze(data);
  }
  return data;
}
export async function loadAssessment(url, ids, expectedHash) {
  const response=await fetch(url, {cache:'no-cache'});
  if (!response.ok) throw Error(`Assessment HTTP ${response.status}`);
  const text=await response.text();
  if(expectedHash){
    const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
    const hex=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
    if(hex!==expectedHash)throw Error('Assessment integrity mismatch; review a new version instead of overwriting history');
  }
  return freezeAssessment(validateAssessment(JSON.parse(text), ids));
}
