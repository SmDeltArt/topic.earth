// Passive, same-origin scene view. The scientific controller remains the source;
// only a sanitized inline SVG copy is displayed, with a transparent Earth hole.
export function createSceneOverlay({doc,limit,map,onScientific,onFever}){
  if(new URL(location.href).searchParams.get('overlay')!=='1'||window.parent===window)return null;
  const ns='http://www.w3.org/2000/svg',container=document.createElement('div');container.id='scene-overlay-svg';
  document.body.classList.add('scene-overlay');document.body.append(container);
  let svg=null,lastMode='scientific';
  function render(rebuild=false){
    if(!svg||rebuild){
      svg=document.importNode(doc.documentElement,true);svg.removeAttribute('width');svg.removeAttribute('height');
      svg.querySelector('#preview-interaction-layer')?.remove();
      const defs=svg.querySelector('defs'),mask=document.createElementNS(ns,'mask');mask.id='scene-earth-cutout';mask.setAttribute('maskUnits','userSpaceOnUse');mask.setAttribute('maskContentUnits','userSpaceOnUse');
      const b=doc.documentElement.viewBox.baseVal;
      for(const [k,v] of Object.entries({x:b.x-10,y:b.y-10,width:b.width+20,height:b.height+20}))mask.setAttribute(k,v);
      const rect=document.createElementNS(ns,'rect');for(const [k,v] of Object.entries({x:b.x-10,y:b.y-10,width:b.width+20,height:b.height+20,fill:'white'}))rect.setAttribute(k,v);
      const hole=document.createElementNS(ns,'circle');for(const [k,v] of Object.entries({cx:limit.center.x,cy:limit.center.y,r:limit.referenceRadius*.98,fill:'black'}))hole.setAttribute(k,v);
      mask.append(rect,hole);defs.append(mask);
      const content=document.createElementNS(ns,'g');content.id='scene-overlay-content';content.setAttribute('mask','url(#scene-earth-cutout)');
      for(const child of [...svg.children])if(!['defs','metadata','title','desc'].includes(child.localName))content.append(child);
      svg.append(content);container.replaceChildren(svg);
      for(const n of svg.querySelectorAll('[tabindex]'))n.removeAttribute('tabindex');
      svg.setAttribute('aria-hidden','true');svg.style.background='transparent';
    }
    for(const entry of map)for(const prefix of ['preview-group-','uncertainty-']){
      const source=doc.getElementById(prefix+entry.id),target=svg.querySelector(`[id="${prefix+entry.id}"]`);if(!source||!target)continue;
      for(const name of ['d','fill','stroke','stroke-width','stroke-dasharray','style']){const value=source.getAttribute(name);if(value===null)target.removeAttribute(name);else target.setAttribute(name,value);}
    }
    for(const id of ['preview-boundary-circle','preview-high-risk-circle','preview-boundary-label','preview-high-risk-label'])svg.querySelector('#'+id)?.setAttribute('visibility',lastMode==='scientific'?'visible':'hidden');
    svg.dataset.sourceMode=lastMode;
  }
  const receive=event=>{
    if(event.source!==window.parent||event.origin!==location.origin||event.data?.type!=='topic-earth:planetary-overlay-state')return;
    const {mode,context}=event.data;if(!['scientific','fever'].includes(mode))return;
    if(mode==='scientific'){if(lastMode!=='scientific')onScientific();}
    else{
      if(!context||!Number.isFinite(context.year)||context.year<1900||context.year>2200||!['best','objective','high'].includes(context.scenario)||!context.progress||typeof context.progress!=='object')return;
      const allowed=new Set(map.map(i=>i.boundary));
      if(Object.entries(context.progress).some(([key,value])=>!allowed.has(key)||!Number.isFinite(value)||value<0||value>10))return;
      onFever(context);
    }
    lastMode=mode;render();
  };
  window.addEventListener('message',receive);window.addEventListener('pagehide',()=>window.removeEventListener('message',receive),{once:true});
  render();const box=doc.documentElement.viewBox.baseVal;
  window.parent.postMessage({type:'topic-earth:planetary-overlay-ready',geometry:{center:{x:limit.center.x,y:limit.center.y},radius:limit.radius,referenceRadius:limit.referenceRadius,viewBox:{x:box.x,y:box.y,width:box.width,height:box.height}}},location.origin);
  return {refresh:()=>render(true)};
}
