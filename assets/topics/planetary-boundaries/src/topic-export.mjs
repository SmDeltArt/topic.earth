import {validateAssessment, riskZone} from './scientific-assessments.mjs';
import {validateSvgDocument} from './svg-safety.mjs';

export function createTopicExport({assessment,map,svgDocument,mode,selected,language,translation,limit,now=new Date()}){
  validateAssessment(assessment,map.map(i=>i.id));
  const metadata={schemaVersion:2,type:'topic_earth_planetary_boundaries_export',exportedAt:now.toISOString(),
    topic:{id:'planetary-boundaries-monitor',title:translation.title,description:translation.summary,
      website:'https://www.topic.earth/',language,sourceLanguage:'en',adaptation:'Benoît Descy / topic.earth',
      dataResources:{indicatorMap:'/assets/topics/planetary-boundaries/data/indicator-map.json',assessmentRegistry:'/assets/topics/planetary-boundaries/data/assessment-registry.json',sourceRegistry:'/assets/topics/planetary-boundaries/data/source-registry.json'},
      translation:{version:translation.version,sourceRevision:translation.sourceRevision,status:translation.visualization.status}},
    assessment,translations:{[language]:translation},visualization:{mode,selectedIndicator:selected,
      description:mode==='scientific'?'Source-checked scientific values; indicator-specific PB/high-risk display alignment.':'Illustrative view; displayed geometry must not be interpreted as scientific measurements.',
      displayTransformation:mode==='scientific'?assessment.displayTransformation:'Legacy linear illustration / original source artwork',
      referenceCircles:{center:{x:limit.center.x,y:limit.center.y},planetaryBoundaryRadius:limit.referenceRadius,highRiskRadius:limit.highRiskRadius,maximumDisplayRadius:limit.radius},
      indicators:map.map(entry=>{
        const indicator=assessment.indicators.find(i=>i.id===entry.id),shape=svgDocument.getElementById(`preview-group-${entry.id}`);
        const visible=shape?.style.display!=='none',extent=visible&&shape?.dataset.previewExtent!==undefined?Number(shape.dataset.previewExtent):null;
        const scientific=visible&&shape?.dataset.scientificRatio!==undefined&&shape.dataset.scientificRatio!=='';
        return {id:entry.id,boundaryId:entry.boundary,label:indicator.label,description:indicator.definition,
          svgGroupId:entry.svgGroupId,svgRectId:entry.svgRectId,observed:indicator.observed,unit:indicator.unit,
          normalizedScientificValue:indicator.normalizedValue,riskZone:riskZone(indicator),
          displayLabel:translation.visualization.indicators[entry.id]??indicator.label,
          representation:!visible?'original_artwork':extent===null?'unquantified':scientific?'scientific_display':'illustrative_override',
          displayedRadius:extent===null?null:Number(shape.dataset.previewRadius),displayedDistanceRelativeToGreenRadius:extent,
          clipped:scientific&&shape?.dataset.scientificClipped==='true'};
      })},
    attribution:{scientificSources:assessment.source,license:assessment.license,
      artwork:'Original user-supplied artwork; underlying artwork license/provenance remains unconfirmed. This export grants no additional rights.',
      adaptation:'Benoît Descy / topic.earth. No scientific endorsement or exclusive third-party artwork ownership claimed.'},
    reuse:{geometry:'Semantic IDs, gradients, masks and clipping paths are preserved. Scientific quantities are separate from SVG coordinates.',
      translations:'Packaged topic.earth translation JSON uses title/summary/insight/sourceRevision plus visualization.ui, boundaries, indicators and svgLabels.',
      updates:'Use a new validated assessment version. This file does not authorize scientific publication or privileged writes.'}};
  const doc=svgDocument.cloneNode(true),root=doc.documentElement;
  doc.getElementById('preview-interaction-layer')?.remove();
  doc.getElementById('topic-earth-export-metadata')?.remove();
  for(const node of doc.querySelectorAll('[tabindex], [aria-pressed]')){
    node.removeAttribute('tabindex');node.removeAttribute('aria-pressed');if(node.getAttribute('role')==='button')node.removeAttribute('role');
  }
  root.setAttribute('role','img');root.setAttribute('lang',language);root.setAttribute('xml:lang',language);
  const node=doc.createElementNS('http://www.w3.org/2000/svg','metadata');node.id='topic-earth-export-metadata';
  node.setAttribute('data-format','application/json');node.textContent=JSON.stringify(metadata);root.prepend(node);
  validateSvgDocument(doc);
  const svg=new XMLSerializer().serializeToString(doc);
  return {metadata,svg,package:{...metadata,artwork:{mimeType:'image/svg+xml',sanitizedSvg:svg}},
    filename:`topic-earth-planetary-boundaries-${assessment.assessmentYear}-${language}-${now.toISOString().replace(/[:.]/g,'-')}`};
}
export function downloadTopicExport(bundle,format){
  if(!['json','svg'].includes(format))throw Error('Unsupported export format');
  const blob=new Blob([format==='svg'?bundle.svg:JSON.stringify(bundle.package,null,2)+'\n'],{type:format==='svg'?'image/svg+xml':'application/json'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`${bundle.filename}.${format}`;a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
