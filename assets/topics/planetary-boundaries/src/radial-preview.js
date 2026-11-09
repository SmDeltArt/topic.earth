const SVG_NS = 'http://www.w3.org/2000/svg';
const CENTER = { x:1474.688, y:472.519 };
const unit = v => { const n=Math.hypot(v.x,v.y); return {x:v.x/n,y:v.y/n}; };

function toRoot(element) {
  let result=new DOMMatrix();
  for(let node=element;node && node!==element.ownerSVGElement;node=node.parentNode) {
    const m=node.transform?.baseVal.consolidate()?.matrix;
    if(m) result=new DOMMatrix([m.a,m.b,m.c,m.d,m.e,m.f]).multiply(result);
  }
  return result;
}
const matrixText=m=>`matrix(${m.a} ${m.b} ${m.c} ${m.d} ${m.e} ${m.f})`;

export function visualBisector(angles,matrix) {
  const rays=angles.map(degrees=>{
    const a=degrees*Math.PI/180,x=Math.cos(a),y=Math.sin(a);
    return unit({x:matrix.a*x+matrix.c*y,y:matrix.b*x+matrix.d*y});
  });
  return {rays,axis:unit({x:rays[0].x+rays[1].x,y:rays[0].y+rays[1].y})};
}

export function createCircleLimit(doc) {
  const root=doc.documentElement,master=doc.getElementById('pb_detail_master');
  const contrast=doc.createElementNS(SVG_NS,'style');contrast.id='preview-label-contrast';
  contrast.textContent='#pb_detail_overlay_labels path,#pb_detail_label_biogeochemical_flows path,#g591 path{paint-order:stroke;stroke:#fff!important;stroke-opacity:.85!important;stroke-width:2.5px!important;stroke-linejoin:round}';
  contrast.textContent+='.indicator-hit:hover,.indicator-hit[data-hovered=true]{fill:#168f7c18;stroke:#007a71;stroke-width:.6}.indicator-hit[data-selected=true]{fill:#168f7c12;stroke:#00695c;stroke-width:.7;stroke-dasharray:2 1}';
  root.append(contrast);
  const separator=doc.getElementById('polygon519');
  const center=new DOMPoint(CENTER.x,CENTER.y).matrixTransform(toRoot(master));
  const tips=Array.from(separator.points,p=>new DOMPoint(p.x,p.y).matrixTransform(toRoot(separator)));
  const tip=tips.reduce((top,p)=>p.y<top.y?p:top);
  const radius=Math.hypot(tip.x-center.x,tip.y-center.y);
  root.style.background='transparent';
  const backing=doc.getElementById('polygon525');
  if(backing) backing.style.display='none';
  const bottomLabel=doc.getElementById('pb_detail_label_biogeochemical_flows');
  if(bottomLabel) {
    const matrix=toRoot(bottomLabel),box=bottomLabel.getBBox();
    const bottom=new DOMPoint(box.x+box.width,box.y+box.height).matrixTransform(matrix).y;
    const lift=Math.max(0,bottom-(center.y+radius-5));
    bottomLabel.setAttribute('transform',matrixText(new DOMMatrix().translate(0,-lift).multiply(matrix)));
    // Keep the full caption above the fills and outside the poster's old crop.
    root.append(bottomLabel);
  }
  const biosphereLabel=doc.getElementById('g591');
  if(biosphereLabel) {
    const matrix=toRoot(biosphereLabel),box=biosphereLabel.getBBox();
    const topLeft=new DOMPoint(box.x,box.y).matrixTransform(matrix);
    const bottomRight=new DOMPoint(box.x+box.width,box.y+box.height).matrixTransform(matrix);
    const angle=-157*Math.PI/180;
    const x=center.x+Math.cos(angle)*radius*.82-(bottomRight.x-topLeft.x)/2;
    const y=center.y+Math.sin(angle)*radius*.82-(bottomRight.y-topLeft.y)/2-5;
    biosphereLabel.setAttribute('transform',matrixText(new DOMMatrix().translate(x-topLeft.x,y-topLeft.y).multiply(matrix)));
    root.append(biosphereLabel);
  }
  // Retain the reference genetic-diversity palette and its green/risk-ring ratio.
  // A root-space radial gradient gives every sector the same centre and scale.
  const reference=doc.getElementById('tp_rect_biosphere_integrity_genetic_diversity');
  const sourceId=decodeURIComponent(reference.style.fill.match(/#([^)'"\s]+)/)[1]);
  const source=doc.getElementById(sourceId);
  const numbers=source.getAttribute('gradientTransform').match(/matrix\(([^)]+)\)/)[1].trim().split(/[ ,]+/).map(Number);
  const gradientMatrix=toRoot(reference).multiply(new DOMMatrix(numbers));
  const gradientRadius=Number(source.getAttribute('r'))*Math.sqrt(Math.abs(gradientMatrix.a*gradientMatrix.d-gradientMatrix.b*gradientMatrix.c));
  const gradient=doc.createElementNS(SVG_NS,'radialGradient');
  gradient.id='preview-shared-gradient'; gradient.setAttribute('gradientUnits','userSpaceOnUse');
  for(const key of ['cx','fx']) gradient.setAttribute(key,center.x);
  for(const key of ['cy','fy']) gradient.setAttribute(key,center.y);
  gradient.setAttribute('r',gradientRadius);
  const sourceStops=Array.from(source.querySelectorAll('stop'));
  const greenColor=sourceStops[0].getAttribute('stop-color');
  const greenStops=sourceStops.filter(stop=>stop.getAttribute('stop-color')===greenColor);
  const referenceRadius=gradientRadius*Math.max(...greenStops.map(stop=>Number(stop.getAttribute('offset'))));
  // Preserve the complete existing green core and its soft boundary halo.
  // Only the risk-zone stops change; original SVG gradient definitions stay intact.
  for(const stop of sourceStops.filter(stop=>Number(stop.getAttribute('offset'))<=.232)) {
    const copy=stop.cloneNode(true);copy.removeAttribute('id');gradient.append(copy);
  }
  const highRiskRadius=referenceRadius*2,highRiskFraction=highRiskRadius/radius;
  const riskStops=[
    [.37,'#fff2bf'], [.43,'#f5d467'], [.51,'#efa63b'],
    [.58,'#ed762b'], [highRiskFraction,'#df4629'], [.70,'#bc2027'],
    [.78,'#922348'], [.86,'#6d225d'], [.94,'#49194f'], [1,'#2c1038']
  ];
  for(const [fraction,color] of riskStops) {
    const stop=doc.createElementNS(SVG_NS,'stop');
    stop.setAttribute('offset',fraction*radius/gradientRadius);
    stop.setAttribute('stop-color',color);gradient.append(stop);
  }
  gradient.setAttribute('color-interpolation','sRGB');
  doc.querySelector('defs').append(gradient);
  // The Safe Operating Space is a fixed background, independent of indicator
  // pressure. Keep the globe green even when a measured ratio is below 1 or unknown.
  const safeCore=doc.createElementNS(SVG_NS,'circle');safeCore.id='preview-safe-operating-space';
  safeCore.setAttribute('cx',center.x);safeCore.setAttribute('cy',center.y);safeCore.setAttribute('r',referenceRadius);
  safeCore.setAttribute('fill','url(#preview-shared-gradient)');safeCore.setAttribute('pointer-events','none');
  doc.getElementById('pb_detail_layer_root').before(safeCore);
  const guide=doc.createElementNS(SVG_NS,'g');guide.id='preview-limit-guide';guide.setAttribute('pointer-events','none');
  const circle=doc.createElementNS(SVG_NS,'circle');circle.id='preview-limit-circle';
  circle.setAttribute('cx',center.x);circle.setAttribute('cy',center.y);circle.setAttribute('r',radius);
  circle.setAttribute('fill','none');circle.setAttribute('stroke','#111');circle.setAttribute('stroke-width','1.5');
  circle.setAttribute('stroke-opacity','0.05');
  circle.setAttribute('vector-effect','non-scaling-stroke');
  const label=doc.createElementNS(SVG_NS,'text');label.textContent='Display max';
  label.setAttribute('x',center.x+7);label.setAttribute('y',center.y-radius+6);
  label.setAttribute('text-anchor','start');label.setAttribute('font-size','4');label.setAttribute('fill','#111');
  const boundary=doc.createElementNS(SVG_NS,'circle');boundary.id='preview-boundary-circle';
  boundary.setAttribute('cx',center.x);boundary.setAttribute('cy',center.y);boundary.setAttribute('r',referenceRadius);
  boundary.setAttribute('fill','none');boundary.setAttribute('stroke','#24683a');
  boundary.setAttribute('stroke-width','1');boundary.setAttribute('vector-effect','non-scaling-stroke');
  boundary.setAttribute('aria-label','100% planetary-boundary reference at the green Safe Operating Space edge');
  const title=doc.createElementNS(SVG_NS,'title');title.textContent='100% = green Safe Operating Space edge; outer circle = display maximum';
  boundary.append(title);
  const highRisk=boundary.cloneNode(false);highRisk.id='preview-high-risk-circle';highRisk.setAttribute('r',highRiskRadius);
  highRisk.setAttribute('stroke','#e86736');highRisk.setAttribute('stroke-opacity','0.5');highRisk.setAttribute('stroke-width','1');
  highRisk.setAttribute('aria-label','High-risk visual reference; indicator-specific thresholds, not a universal scientific ratio');
  const highTitle=doc.createElementNS(SVG_NS,'title');highTitle.textContent='Known high-risk thresholds align here in scientific display mode; unknown thresholds do not validate this ring';highRisk.append(highTitle);
  const pbLabel=doc.createElementNS(SVG_NS,'text');pbLabel.id='preview-boundary-label';pbLabel.textContent='100% PB';
  pbLabel.setAttribute('x',center.x+3);pbLabel.setAttribute('y',center.y+referenceRadius-2);pbLabel.setAttribute('font-size','3.5');pbLabel.setAttribute('fill','#124427');
  pbLabel.setAttribute('paint-order','stroke');pbLabel.setAttribute('stroke','#fff');pbLabel.setAttribute('stroke-width','.35');
  const highLabel=pbLabel.cloneNode(false);highLabel.id='preview-high-risk-label';highLabel.textContent='High-risk reference';
  highLabel.setAttribute('y',center.y-highRiskRadius+4);highLabel.setAttribute('fill','#8c3415');
  guide.append(circle,label,boundary,highRisk,pbLabel,highLabel);root.append(guide);
  return {center,radius,referenceRadius,highRiskRadius,maxRatio:radius/referenceRadius,radiusScreen:radius,
    bounds:{x:center.x-radius-4,y:center.y-radius-8,right:center.x+radius+4,bottom:center.y+radius+4},
    clipSourceGroup(group) {
      const parent=group.parentNode,clip=doc.createElementNS(SVG_NS,'clipPath');
      clip.id=`source-limit-${group.id}`;clip.setAttribute('clipPathUnits','userSpaceOnUse');
      const boundary=circle.cloneNode();boundary.removeAttribute('id');boundary.removeAttribute('stroke');
      boundary.setAttribute('fill','#000');boundary.setAttribute('transform',matrixText(toRoot(parent).inverse()));
      clip.append(boundary);doc.querySelector('defs').append(clip);
      const wrapper=doc.createElementNS(SVG_NS,'g');wrapper.dataset.sourceCircleLimit=group.id;
      wrapper.setAttribute('clip-path',`url(#${clip.id})`);group.before(wrapper);wrapper.append(group);
    }
  };
}

export function createRadialPreview(doc,entry,rect,onSelect,limit) {
  const sourceGroup=doc.getElementById(entry.svgGroupId),originalDisplay=sourceGroup.style.display;
  const {rays}=visualBisector(entry.svgWedgeAngles,toRoot(rect.parentNode));
  limit.clipSourceGroup(sourceGroup);
  let layer=doc.getElementById('radial-preview-layer');
  if(!layer) {
    layer=doc.createElementNS(SVG_NS,'g');layer.id='radial-preview-layer';
    doc.getElementById('pb_detail_layer_root').before(layer);
  }
  const shape=doc.createElementNS(SVG_NS,'path');
  shape.id=`preview-group-${entry.id}`;shape.dataset.previewGeometry=entry.id;
  shape.setAttribute('fill','url(#preview-shared-gradient)');shape.style.cursor='pointer';
  shape.setAttribute('role','button');shape.setAttribute('tabindex','0');
  shape.setAttribute('aria-label',entry.label);
  shape.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();onSelect();}});
  shape.addEventListener('click',onSelect);layer.append(shape);shape.style.display='none';
  const range=doc.createElementNS(SVG_NS,'path');range.id=`uncertainty-${entry.id}`;
  range.setAttribute('fill','none');range.setAttribute('stroke','#effff9');range.setAttribute('stroke-width','1.5');
  range.setAttribute('stroke-dasharray','3 2');range.setAttribute('vector-effect','non-scaling-stroke');
  range.setAttribute('pointer-events','none');range.setAttribute('aria-hidden','true');range.style.display='none';layer.append(range);
  function wedge(ratio){
    const value=Math.min(limit.maxRatio,Math.max(0,ratio)),r=limit.referenceRadius*value,{x,y}=limit.center;
    const points=rays.map(ray=>({x:x+ray.x*r,y:y+ray.y*r}));
    return {value,r,x,y,d:r>0 ? `M ${x} ${y} L ${points[0].x} ${points[0].y} A ${r} ${r} 0 0 1 ${points[1].x} ${points[1].y} Z` : `M ${x} ${y} Z`};
  }
  let interactions=doc.getElementById('preview-interaction-layer');
  if(!interactions){interactions=doc.createElementNS(SVG_NS,'g');interactions.id='preview-interaction-layer';doc.documentElement.append(interactions);}
  const hit=doc.createElementNS(SVG_NS,'path');hit.id=`indicator-hit-${entry.id}`;hit.setAttribute('class','indicator-hit');
  hit.setAttribute('d',wedge(limit.maxRatio).d);hit.setAttribute('fill','transparent');hit.setAttribute('pointer-events','all');hit.setAttribute('aria-hidden','true');hit.style.cursor='pointer';
  hit.addEventListener('click',onSelect);
  for(const [event,active] of [['pointerenter',true],['pointerleave',false]])hit.addEventListener(event,()=>doc.dispatchEvent(new CustomEvent('topic-indicator-hover',{detail:{id:entry.id,active}})));
  interactions.append(hit);
  let bounds=null;
  return {
    apply(ratio) {
      // Keep the linear ratio mapping. Its 1.0 anchor is now the green edge;
      // clipping at the outer circle is a visual cap, not a scientific threshold.
      const {value,r,x,y,d}=wedge(ratio);shape.setAttribute('d',d);
      shape.setAttribute('fill','url(#preview-shared-gradient)');shape.removeAttribute('stroke');shape.removeAttribute('stroke-dasharray');range.style.display='none';
      shape.dataset.previewRadius=String(r);shape.dataset.previewExtent=String(value);
      shape.style.display='';sourceGroup.style.display='none';
      bounds={x:x-r,y:y-r,right:x+r,bottom:y+r};
    },
    uncertainty(ratio){
      if(ratio?.kind==='range') {range.setAttribute('d',wedge(ratio.max).d);range.style.display='';}
      if(ratio?.kind==='lower_bound') {shape.setAttribute('stroke','#effff9');shape.setAttribute('stroke-width','1');shape.setAttribute('stroke-dasharray','2 1');}
    },
    unquantified(){
      shape.setAttribute('d',wedge(1).d);shape.setAttribute('fill','none');shape.removeAttribute('stroke');
      shape.style.display='';sourceGroup.style.display='none';range.style.display='none';
      delete shape.dataset.previewRadius;delete shape.dataset.previewExtent;
      shape.setAttribute('aria-label',`${entry.label}: exceeded qualitatively; no quantified radius`);
    },
    getBounds(){return bounds;},
    restore(){shape.style.display='none';range.style.display='none';delete shape.dataset.previewRadius;delete shape.dataset.previewExtent;sourceGroup.style.display=originalDisplay;bounds=null;}
  };
}
