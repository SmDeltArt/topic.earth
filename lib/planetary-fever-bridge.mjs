// Read-only bridge: Fever's nine authored progress indices are illustrations,
// never the thirteen physical control variables or validated PB ratios.
export function feverBoundaryContext(globe,boundaries){
  if(!globe.inFeverMode)return null;
  const year=globe.getFeverCurrentYear(),scenario=globe.getFeverScenario();
  if(!Number.isFinite(year)||!['best','objective','high'].includes(scenario))return null;
  const progress={};
  for(const [id,boundary] of Object.entries(boundaries)){
    const values=boundary.scenarios?.[scenario];if(!values)continue;
    const years=Object.keys(values).map(Number).filter(Number.isFinite).sort((a,b)=>a-b);
    if(!years.length)continue;
    const lo=[...years].reverse().find(y=>y<=year)??years[0],hi=years.find(y=>y>=year)??years.at(-1);
    const a=values[lo]?.progress,b=values[hi]?.progress;if(!Number.isFinite(a)||!Number.isFinite(b))continue;
    progress[id]=a+(b-a)*(hi===lo?0:(year-lo)/(hi-lo));
  }
  return {year,scenario,progress,source:'Fever authored scenario indices; not observational control variables'};
}
export function overlayFrame(center,viewBox,anchorRadius,earthRadiusPixels,scale=1){
  if(![center.x,center.y,viewBox.x,viewBox.y,viewBox.width,viewBox.height,anchorRadius,earthRadiusPixels,scale].every(Number.isFinite)||viewBox.width<=0||viewBox.height<=0||anchorRadius<=0||earthRadiusPixels<=0||scale<=0)return null;
  const units=earthRadiusPixels/anchorRadius*scale;
  return {width:viewBox.width*units,height:viewBox.height*units,offsetX:(center.x-viewBox.x)*units,offsetY:(center.y-viewBox.y)*units};
}
// Keep the full SVG inside Earth's silhouette, leaving the visible globe rim
// shown in the reference image. The slider scales this maximum, never exceeds it.
export function overlayRadiusPixels(earthRadiusPixels,scale=1,availableRadius=Infinity){
  return Math.min(earthRadiusPixels*.85,availableRadius)*Math.min(1,Math.max(.4,scale));
}
