import { CYCLONE_LAYER_ID, CYCLONE_STALE_MS, cycloneCategory, cycloneColor, stormType, coordinate, clean, iso, numeric } from './cyclone-data.mjs?v=cyclones-20261013';
export { CYCLONE_LAYER_ID };
const escape = value => String(value ?? '').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const safeLink = value => /^https:\/\/(?:www\.nhc\.noaa\.gov|ftp\.nhc\.noaa\.gov|www\.jma\.go\.jp|www\.metoc\.navy\.mil)\//.test(String(value)) ? String(value) : '';
const timeLabel = value => iso(value) ? new Date(value).toISOString().replace('T',' ').replace('.000Z',' UTC') : 'Not supplied';
const distance = radius => `${Math.round(radius)} km`;
export function validateCycloneSnapshot(value) {
  if(value?.version !== 1 || !iso(value.fetchedAt) || !Array.isArray(value.storms) || !value.sources || !['nhc','jma','jtwc'].every(key=>typeof value.sources[key]?.ok === 'boolean')) throw new Error('Invalid cyclone snapshot');
  const storms=value.storms.slice(0,80).flatMap(storm=>{
    if(!/^[\w-]{1,60}$/.test(storm.id || '') || !['NHC','JMA','JTWC'].includes(storm.provider) || !coordinate(storm.lat,storm.lon) || !iso(storm.issuedAt)) return [];
    const track=rows=>(Array.isArray(rows)?rows:[]).filter(row=>coordinate(row.lat,row.lon)).slice(-300).map(row=>({lat:Number(row.lat),lon:Number(row.lon),validAt:iso(row.validAt),hours:numeric(row.hours,0,168)}));
    const extents=(Array.isArray(storm.windExtents)?storm.windExtents:[]).slice(0,20).flatMap(item=>{
      if(!coordinate(item.center?.lat,item.center?.lon) || !iso(item.issuedAt) || ![30,34,50,64].includes(item.thresholdKt)) return [];
      const quadrants=Array.isArray(item.quadrantsKm) && item.quadrantsKm.length === 4 && item.quadrantsKm.every(v=>numeric(v,0,3000)!==null) ? item.quadrantsKm.map(Number) : null;
      const radius=numeric(item.radiusKm,0.001,3000);
      if(!quadrants && radius === null) return [];
      return [{thresholdKt:item.thresholdKt,quadrantsKm:quadrants,radiusKm:radius,center:{lat:Number(item.center.lat),lon:Number(item.center.lon)},issuedAt:iso(item.issuedAt),provider:clean(item.provider),bearings:Array.isArray(item.bearings)&&item.bearings.length===2&&item.bearings.every(v=>numeric(v,0,360)!==null)?item.bearings.map(Number):null}];
    });
    return [{...storm,name:clean(storm.name),classification:clean(storm.classification),lat:Number(storm.lat),lon:Number(storm.lon),windKt:numeric(storm.windKt,0,250),pressureHpa:numeric(storm.pressureHpa,800,1100),movementKt:numeric(storm.movementKt,0,150),movementDegrees:numeric(storm.movementDegrees,0,360),
      windExtents:extents,pastTrack:track(storm.pastTrack),forecastTrack:track(storm.forecastTrack).filter(row=>row.validAt && row.validAt > storm.issuedAt),
      advisoryUrl:safeLink(storm.advisoryUrl),sourceUrl:safeLink(storm.sourceUrl),secondarySourceUrl:safeLink(storm.secondarySourceUrl),trackSourceUrl:safeLink(storm.trackSourceUrl),forecastSourceUrl:safeLink(storm.forecastSourceUrl)}];
  });
  return {...value,storms:[...new Map(storms.map(storm=>[storm.id,storm])).values()]};
}
export function retainUnavailableCyclones(snapshot, previous) {
  const storms=[...snapshot.storms];
  for(const old of previous?.storms || []) {
    const key=old.provider.toLowerCase();
    if(!snapshot.sources[key]?.ok && !storms.some(storm=>storm.id===old.id)) {
      const index=storms.findIndex(storm=>storm.name.toLowerCase()===old.name.toLowerCase() && Math.abs(storm.lat-old.lat)<3 && Math.abs(((storm.lon-old.lon+540)%360)-180)<5);
      if(index >= 0) storms[index]={...storms[index],id:old.id};
      else storms.push({...old,sourceUnavailable:true});
    }
  }
  return {...snapshot,storms};
}
export function cycloneStoryHtml(storm,now=Date.now()) {
  const stale=storm.sourceUnavailable || now-Date.parse(storm.issuedAt)>CYCLONE_STALE_MS, color=cycloneColor(storm), category=cycloneCategory(storm);
  const measurements=[['Position',`${storm.lat.toFixed(2)}° latitude / ${storm.lon.toFixed(2)}° longitude`],['Reported position time',timeLabel(storm.issuedAt)],
    ['Sustained wind',storm.windKt===null ? 'Not supplied' : `${storm.windKt} kt · ${Math.round(storm.windKt*1.852)} km/h · ${storm.windPeriod || 'unspecified'} average · ${storm.windProvider || storm.provider}`],
    ['Pressure',storm.pressureHpa===null?'Not supplied':`${storm.pressureHpa} hPa`],['Movement',storm.movementKt===null?'Not supplied':`${Math.round(storm.movementKt*1.852)} km/h${storm.movementDegrees!==null ? ' · '+storm.movementDegrees+'° bearing' : ''}`]];
  if(storm.windIssuedAt && storm.windIssuedAt !== storm.issuedAt) measurements.push(['Wind report time',timeLabel(storm.windIssuedAt)]);
  const sizes=storm.windExtents.map(extent=>`<li><strong>${extent.thresholdKt} kt wind area · ${escape(extent.provider)}</strong><br>${extent.quadrantsKm ? ['NE','SE','SW','NW'].map((direction,i)=>`${direction}: ${distance(extent.quadrantsKm[i])}`).join(' · ') : `Radius: ${distance(extent.radiusKm)}${extent.bearings ? ' · bearings '+extent.bearings.join('–')+'°' : ''}`}<br><small>${timeLabel(extent.issuedAt)}</small></li>`).join('');
  const links=[['Latest advisory',storm.advisoryUrl],['Position data',storm.sourceUrl],['Wind source',storm.secondarySourceUrl],['Reported track / radii',storm.trackSourceUrl],['Forecast data',storm.forecastSourceUrl]].filter(([,url])=>url).map(([label,url])=>`<a href="${escape(url)}" target="_blank" rel="noopener noreferrer">${label} ↗</a>`).join(' · ');
  return `<article class="topic-story-card" style="max-width:900px;margin:auto;padding:20px;font:17px/1.65 system-ui;background:#071019;color:#e8eaed;border-radius:16px;border:1px solid ${color}">
    <p style="color:${color};letter-spacing:.08em">TOPIC.EARTH · CYCLONE WATCH · ${escape(storm.basin)}</p><h1 style="color:${color};font-size:clamp(26px,6vw,44px)">🌀 ${escape(storm.name)}</h1>
    <p>${escape(stormType(storm.classification))}${category ? ' · Category '+category+' (NHC)' : ''} · ${escape(storm.provider)}${storm.finalWarning ? ' · final JTWC warning received' : ''}</p>
    <p style="padding:12px;background:#141824;border-left:3px solid ${stale?'#ffb020':color}">${stale ? 'STALE / SOURCE UNAVAILABLE — latest retained report, not a current position.' : 'Latest reported advisory position. The spiral is a stylised symbol; it does not show the satellite cloud shape.'}</p>
    <section class="panel" style="padding:14px;background:#141824;border-radius:12px"><h2>Reported conditions</h2><dl>${measurements.map(([label,value])=>`<dt style="color:${color}">${label}</dt><dd style="margin:0 0 12px">${escape(value)}</dd>`).join('')}</dl></section>
    <section class="panel"><h2>Wind extent / storm size</h2>${sizes ? `<ul>${sizes}</ul>` : '<p>Wind radii are not supplied. No size footprint is drawn; the spiral remains a readable position symbol.</p>'}<p>The transparent footprint follows the published radii and their own report time. Wind thresholds differ: JMA uses 30/50 kt areas; NHC uses 34/50/64 kt. These are wind areas, not the forecast uncertainty cone.</p></section>
    <section class="panel"><h2>Track</h2><p>Solid cyan line: reported past track. Dashed line: forecast positions. Forecasts may change and are not observed locations.</p>${storm.forecastTrack.length ? `<p>Forecast issue: ${timeLabel(storm.forecastIssuedAt || storm.issuedAt)}</p><ol>${storm.forecastTrack.map(p=>`<li>${timeLabel(p.validAt)} · ${p.lat.toFixed(1)}°, ${p.lon.toFixed(1)}°</li>`).join('')}</ol>` : '<p>No forecast track supplied by the available feed.</p>'}</section>
    <section class="panel"><h2>Understanding the display</h2><p>Spirals use a minimum readable size and rotate as an illustration. Only the transparent geographic footprint represents wind extent to scale. Wind averages from different agencies are labelled and should not be compared as identical measurements.</p><p>Refresh checks run every 10 minutes while this World layer is active. Agencies publish advisories periodically. For local warnings and protective action, follow the responsible national weather service.</p></section>
<section class="panel"><h2>El Niño 2026–2027 context</h2><p>The NOAA assessment issued 8 October 2026 reports a strengthening El Niño, likely to remain strong into early 2027. El Niño generally favours eastern/central Pacific hurricane development and suppresses Atlantic activity through wind shear. Atlantic storms can still occur. This seasonal influence does not establish that El Niño caused this individual storm.</p><p><a href="https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso_advisory/ensodisc.shtml" target="_blank" rel="noopener noreferrer">Latest NOAA ENSO assessment ↗</a> · <a href="https://www.noaa.gov/news-release/el-nino-forms-expected-to-strengthen-say-noaa-forecasters" target="_blank" rel="noopener noreferrer">NOAA: basin effects ↗</a></p></section>
    <details><summary>En français</summary><p>La spirale est un symbole à la position annoncée, pas une image satellite. La surface transparente représente les rayons de vent publiés, avec leur date. Le trait plein montre la trajectoire passée et le trait discontinu les prévisions. Si la source est indisponible, la dernière position conservée est clairement signalée. Pour les alertes locales, consulter le service météorologique national.</p></details><footer style="margin-top:20px">${links}</footer></article>`;
}
export function buildCycloneTopics(snapshot,now=Date.now()) {
  const topics=snapshot.storms.map(storm=>{
    const stale=storm.sourceUnavailable || now-Date.parse(storm.issuedAt)>CYCLONE_STALE_MS;
    const type=stormType(storm.classification),category=cycloneCategory(storm),name=`${type} ${storm.name}`;
    return {id:'cyclone-'+storm.id,category:CYCLONE_LAYER_ID,title:name,lat:storm.lat,lon:storm.lon,language:'en',country:'Ocean monitoring',region:storm.basin,date:storm.issuedAt.slice(0,10),updatedAt:storm.issuedAt,
      isTropicalCyclone:true,cyclone:{...storm,stale},onlineLayerSignal:true,sourceType:storm.provider+' advisory',confidence:'agency-reported',severity:stale?'stale':category?'category-'+category:storm.classification.toLowerCase(),markerColor:stale?'#94a3b8':cycloneColor(storm),markerPriority:100+(storm.windKt || 0),
      summary:`${storm.lat.toFixed(1)}°, ${storm.lon.toFixed(1)}° · ${storm.windKt===null?'Wind unavailable':Math.round(storm.windKt*1.852)+' km/h'} · ${timeLabel(storm.issuedAt)}${stale?' · STALE':''}`,
      insight:'Click the linked spiral to read its reported position, agency data, wind footprint and forecast track. '+(stale?'Latest retained data; source unavailable or advisory older than 12 hours.':'Advisory data updates periodically; animated spiral rotation is illustrative.'),
      source:storm.provider+' · '+storm.sourceUrl,sources:[{name:storm.provider,url:storm.advisoryUrl || storm.sourceUrl,category:'official',reliability:'high'}],
      topicStory:{enabled:true,title:name,style:'story-card',themeMode:'world',html:cycloneStoryHtml(storm,now),scriptsAllowed:false}};
  });
  const failed=Object.entries(snapshot.sources || {}).filter(([,source])=>!source.ok).map(([name])=>name.toUpperCase());
  const status=snapshot.pending ? 'Checking official cyclone sources…' : failed.length ? 'Source unavailable / partial coverage: '+failed.join(', ') : topics.length ? topics.length+' active or recently advised cyclone(s).' : 'No active systems reported by the available sources.';
  topics.push({id:'cyclone-layer-guide',category:CYCLONE_LAYER_ID,title:'🌀 World cyclone watch — sources & El Niño',lat:20,lon:-140,hideGlobeMarker:true,language:'en',country:'Ocean monitoring',region:'Pacific / Atlantic',date:snapshot.fetchedAt.slice(0,10),updatedAt:snapshot.fetchedAt,onlineLayerSignal:true,markerPriority:-1,sourceType:'Source status',summary:status,
    insight:snapshot.coverage || 'Pacific and Atlantic agency coverage.',source:'NOAA / NHC · JMA · JTWC',topicStory:{enabled:true,title:'Cyclone watch',themeMode:'world',style:'story-card',scriptsAllowed:false,html:`<article style="font:17px/1.65 system-ui;color:#e8eaed;background:#071019;padding:20px"><h1>🌀 Cyclone watch</h1><p>${escape(status)}</p><p>${escape(snapshot.coverage || 'Coverage status is unavailable.')}</p><h2>Globe legend</h2><ul><li>Named spiral: reported storm position; click to open its topic.</li><li>Transparent area: published wind radii, to geographic scale. Blue: 30/34 kt; amber: 50 kt; red: 64 kt.</li><li>Solid cyan: past track. Dashed cyan: forecast.</li><li>Grey spiral: old advisory or unavailable source. Missing size data never creates an invented footprint.</li></ul><p>Spiral colours: cyan for depressions, green for tropical storms, amber for hurricanes/typhoons, orange/pink for major NHC hurricanes or super typhoons. Saffir–Simpson categories apply only to NHC hurricanes.</p><p>Checks every 10 minutes while the World layer is active. Latest check: ${timeLabel(snapshot.fetchedAt)}. Report times remain visible; this is advisory tracking, not continuous observed motion.</p><p>No AI or API key is required. This educational view links to official sources; local national weather services issue protective warnings.</p><section class="panel"><h2>El Niño 2026–2027 context</h2><p>The NOAA assessment issued 8 October 2026 reports a strengthening El Niño, likely to remain strong into early 2027. El Niño generally favours eastern/central Pacific hurricane development and suppresses Atlantic activity through wind shear. Atlantic storms can still occur. This seasonal influence does not establish that El Niño caused this individual storm.</p><p><a href="https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso_advisory/ensodisc.shtml" target="_blank" rel="noopener noreferrer">Latest NOAA ENSO assessment ↗</a> · <a href="https://www.noaa.gov/news-release/el-nino-forms-expected-to-strengthen-say-noaa-forecasters" target="_blank" rel="noopener noreferrer">NOAA: basin effects ↗</a></p></section><h2>En français</h2><p>Cliquer sur une spirale pour consulter le cyclone. La surface transparente suit les rayons de vent publiés. Trait plein : passé ; trait discontinu : prévision. Gris : données anciennes ou source indisponible. Les zones non couvertes ne doivent pas être considérées comme sans cyclone.</p></article>`}});
  return topics;
}
export async function fetchLiveCyclones({fetchImpl=globalThis.fetch,previous=null,now=Date.now()}={}) {
  try {
    const response=await fetchImpl('/api/tropical-cyclones',{signal:AbortSignal.timeout(25000),cache:'no-cache'});
    if(!response.ok) throw new Error(`Cyclone data unavailable (HTTP ${response.status})`);
    return retainUnavailableCyclones(validateCycloneSnapshot(await response.json()),previous);
  } catch(error) {
    return {version:1,fetchedAt:new Date(now).toISOString(),storms:(previous?.storms || []).map(storm=>({...storm,sourceUnavailable:true})),sources:Object.fromEntries(['nhc','jma','jtwc'].map(key=>[key,{ok:false,error:error.message}])),coverage:previous?.coverage || 'Cyclone sources unavailable. No current storm positions can be confirmed.'};
  }
}
