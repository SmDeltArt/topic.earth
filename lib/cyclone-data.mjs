export const CYCLONE_LAYER_ID = 'tropical-cyclones';
export const CYCLONE_REFRESH_MS = 10 * 60 * 1000;
export const CYCLONE_STALE_MS = 12 * 60 * 60 * 1000;
export const SOURCES = {
  nhc:'https://www.nhc.noaa.gov/CurrentStorms.json',
  jma:'https://www.jma.go.jp/bosai/typhoon/data/targetTc.json',
  jtwc:'https://www.metoc.navy.mil/jtwc/products/abpwweb.txt',
  jtwcIndian:'https://www.metoc.navy.mil/jtwc/products/abioweb.txt'
};
export const clean = value => String(value || '').replace(/[\u0000-\u001f<>]/g,' ').trim().slice(0,160);
export const numeric = (value,min,max) => value === null || value === undefined || value === '' || !Number.isFinite(Number(value)) || Number(value) < min || Number(value) > max ? null : Number(value);
export const coordinate = (lat,lon) => numeric(lat,-90,90) !== null && numeric(lon,-180,180) !== null;
export const iso = value => Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : null;
const types = {HU:'Hurricane',TS:'Tropical storm',TD:'Tropical depression',STS:'Severe tropical storm',TY:'Typhoon',STY:'Super typhoon',TC:'Tropical cyclone',PTC:'Potential tropical cyclone',SD:'Subtropical depression',SS:'Subtropical storm',EX:'Post-tropical cyclone'};
export const stormType = code => types[code] || 'Tropical cyclone';
export function cycloneCategory(storm) {
  if (storm.provider !== 'NHC' || storm.classification !== 'HU' || storm.windKt === null) return null;
  return storm.windKt >= 137 ? 5 : storm.windKt >= 113 ? 4 : storm.windKt >= 96 ? 3 : storm.windKt >= 83 ? 2 : 1;
}
export function cycloneColor(storm) {
  const category = cycloneCategory(storm);
  if (category >= 4 || storm.classification === 'STY') return '#ff3576';
  if (category >= 3) return '#ff6433';
  if (['HU','TY'].includes(storm.classification)) return '#ffb020';
  return ['TS','STS','SS'].includes(storm.classification) ? '#39ff88' : '#00d4ff';
}
export function parseNhc(data) {
  if (!Array.isArray(data?.activeStorms)) throw new Error('Invalid NOAA storm feed');
  return data.activeStorms.slice(0,30).flatMap(item => {
    if (!/^(al|ep|cp)\d{6}$/.test(item.id) || !coordinate(item.latitudeNumeric,item.longitudeNumeric) || !iso(item.lastUpdate)) return [];
    return [{id:'nhc-'+item.id,agencyId:item.id,provider:'NHC',name:clean(item.name) || item.id,
      classification:clean(item.classification),lat:Number(item.latitudeNumeric),lon:Number(item.longitudeNumeric),
      issuedAt:iso(item.lastUpdate),windKt:numeric(item.intensity,0,250),windPeriod:'1-minute',windProvider:'NHC',
      pressureHpa:numeric(item.pressure,800,1100),movementKt:numeric(item.movementSpeed,0,150),movementDegrees:numeric(item.movementDir,0,360),
      basin:item.id.startsWith('al') ? 'North Atlantic' : item.id.startsWith('cp') ? 'Central North Pacific' : 'Eastern North Pacific',
      advisoryUrl:/^https:\/\/www\.nhc\.noaa\.gov\/text\/\w+\.shtml$/.test(item.publicAdvisory?.url || '') ? item.publicAdvisory.url : SOURCES.nhc,
      sourceUrl:SOURCES.nhc,windExtents:[],pastTrack:[],forecastTrack:[]}];
  });
}
export function atcfCoordinate(value) {
  const match = /^(\d{1,4})([NSEW])$/.exec(String(value).trim());
  return match ? Number(match[1])/10 * (/[SW]/.test(match[2]) ? -1 : 1) : null;
}
export function atcfTime(value) {
  const m = /^(\d{4})(\d{2})(\d{2})(\d{2})$/.exec(value);
  return m ? iso(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:00:00Z`) : null;
}
export function parseAtcf(text, technique = 'BEST') {
  const records = String(text).split(/\r?\n/).slice(0,8000).flatMap(line=>{
    const f = line.split(',').map(value=>value.trim());
    if (f[4] !== technique || !atcfTime(f[2])) return [];
    const lat = atcfCoordinate(f[6]),lon = atcfCoordinate(f[7]),hours = numeric(f[5],0,168);
    if (lat === null || lon === null || !coordinate(lat,lon) || hours === null) return [];
    const issuedAt = atcfTime(f[2]), validAt = new Date(Date.parse(issuedAt)+hours*3600000).toISOString();
    const thresholdKt = numeric(f[11],30,64), startQuadrant = ['NEQ','SEQ','SWQ','NWQ'].indexOf(f[12]);
    let quadrantsKm = null;
    if (thresholdKt !== null && startQuadrant >= 0 && f.slice(13,17).length === 4) {
      const radii = f.slice(13,17).map(value=>numeric(value,0,1500));
      if (radii.every(value=>value !== null)) { quadrantsKm = []; radii.forEach((value,index)=>{quadrantsKm[(startQuadrant+index)%4]=value*1.852;}); }
    } else if (thresholdKt !== null && f[12] === 'AAA') {
      const radius = numeric(f[13],0,1500); if (radius !== null) quadrantsKm = [radius,radius,radius,radius].map(value=>value*1.852);
    }
    return [{lat,lon,issuedAt,validAt,hours,windKt:numeric(f[8],0,250),thresholdKt,quadrantsKm}];
  });
  const latest = records.reduce((time,item)=>item.issuedAt > time ? item.issuedAt : time,'');
  const latestRows = records.filter(item=>item.issuedAt === latest);
  const points = [...new Map((technique === 'BEST' ? records : latestRows).map(item=>[item.validAt,{lat:item.lat,lon:item.lon,validAt:item.validAt,hours:item.hours}])).values()].sort((a,b)=>a.validAt.localeCompare(b.validAt)).slice(-300);
  const current = latestRows.filter(item=>item.hours === 0);
  const windExtents = current.filter(item=>item.quadrantsKm?.some(value=>value > 0)).map(item=>({thresholdKt:item.thresholdKt,quadrantsKm:item.quadrantsKm,center:{lat:item.lat,lon:item.lon},issuedAt:item.validAt,provider:'NHC'}));
  return {points,windExtents,issuedAt:latest || null};
}
export function parseJma(entry, rows) {
  if (!/^TC\d{4}$/.test(entry.tropicalCyclone) || !Array.isArray(rows)) throw new Error('Invalid JMA cyclone record');
  const title = rows.find(row=>row.part === 'title');
  const analysis = rows.find(row=>row.advancedHours === 0);
  if (!analysis || !coordinate(...(analysis.center || [])) || !iso(analysis.validtime?.UTC)) throw new Error('JMA analysis is missing');
  const issuedAt = iso(analysis.validtime.UTC), [lat,lon] = analysis.center;
  const windExtents = [];
  const gale = analysis.galeWarningArea;
  if (coordinate(...(gale?.center || [])) && numeric(gale?.radius,1,3000000) !== null) windExtents.push({thresholdKt:30,radiusKm:Number(gale.radius)/1000,center:{lat:gale.center[0],lon:gale.center[1]},issuedAt,provider:'JMA'});
  // Each published arc keeps its own centre, radius and bearings. No forecast
  // probability circles or future storm-warning areas are treated as size.
  for (const arc of (analysis.stormWarningArea?.arc || []).slice(0,12)) {
    if (coordinate(...(arc[0] || [])) && numeric(arc[1],1,3000000) !== null && Array.isArray(arc[2]) && arc[2].length === 2 && arc[2].every(v=>numeric(v,0,360)!==null)) windExtents.push({thresholdKt:50,radiusKm:arc[1]/1000,center:{lat:arc[0][0],lon:arc[0][1]},bearings:arc[2],issuedAt,provider:'JMA'});
  }
  const track = [...(analysis.track?.preTyphoon || []),...(analysis.track?.typhoon || [])].filter(p=>coordinate(...p)).slice(-300).map(p=>({lat:p[0],lon:p[1]}));
  return {id:'jma-'+entry.tropicalCyclone,agencyId:entry.tropicalCyclone,provider:'JMA',name:clean(title?.name?.en) || clean(entry.typhoonNumber),classification:clean(entry.category),
    lat:Number(lat),lon:Number(lon),issuedAt,sourceUrl:`https://www.jma.go.jp/bosai/typhoon/data/${entry.tropicalCyclone}/forecast.json`,advisoryUrl:'https://www.jma.go.jp/bosai/typhoon/',
    basin:'Western North Pacific',windKt:null,windProvider:'JMA',windPeriod:'10-minute',pressureHpa:null,movementKt:null,movementDegrees:null,
    windExtents,pastTrack:track,forecastTrack:rows.filter(row=>row.advancedHours > 0 && coordinate(...(row.center || [])) && iso(row.validtime?.UTC)).slice(0,12).map(row=>({lat:row.center[0],lon:row.center[1],validAt:iso(row.validtime.UTC),hours:row.advancedHours}))};
}
export function parseJtwc(text,sourceUrl=SOURCES.jtwc) {
  const content = String(text).replace(/\s+/g,' '), months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  const regex = /AT (\d{2})([A-Z]{3})(\d{2}) (\d{2})(\d{2})Z, (TROPICAL DEPRESSION|TROPICAL STORM|SUPER TYPHOON|TYPHOON|TROPICAL CYCLONE) (\d{2}[WSEPAB]) \(([^)]+)\) WAS LOCATED NEAR ([\d.]+)([NS]) ([\d.]+)([EW]),([\s\S]*?)(?= AT \d{2}[A-Z]{3}\d{2} \d{4}Z,| \(\d\) NO OTHER| B\. TROPICAL DISTURBANCE|$)/g;
  return [...content.matchAll(regex)].flatMap(m=>{
    const lat = Number(m[9])*(m[10]==='S'?-1:1), lon=Number(m[11])*(m[12]==='W'?-1:1), month=months.indexOf(m[2]);
    const issuedAt = month < 0 ? null : iso(`20${m[3]}-${String(month+1).padStart(2,'0')}-${m[1]}T${m[4]}:${m[5]}:00Z`);
    if (!coordinate(lat,lon) || !issuedAt) return [];
    const wind = /MAXIMUM SUSTAINED SURFACE WINDS WERE ESTIMATED AT (\d+) KNOTS/.exec(m[13]);
    const speed = /TRACKED [A-Z-]+ AT (\d+) KNOTS/.exec(m[13]);
    const classification = {'TROPICAL DEPRESSION':'TD','TROPICAL STORM':'TS','SUPER TYPHOON':'STY','TYPHOON':'TY','TROPICAL CYCLONE':'TC'}[m[6]];
    return [{id:`jtwc-${m[7].toLowerCase()}-20${m[3]}`,agencyId:m[7],provider:'JTWC',name:clean(m[8]),classification,lat,lon,issuedAt,windKt:wind?Number(wind[1]):null,windProvider:'JTWC',windPeriod:'1-minute',
      pressureHpa:null,movementKt:speed?Number(speed[1]):null,movementDegrees:null,basin:/[AB]$/.test(m[7]) ? 'North Indian Ocean' : /S$/.test(m[7]) ? 'South Indian Ocean / Australian region' : /P$/.test(m[7]) ? 'South Pacific / Australian region' : 'Western North Pacific',sourceUrl,advisoryUrl:'https://www.metoc.navy.mil/jtwc/jtwc.html',
      finalWarning:/FINAL WARNING/.test(m[13]),windExtents:[],pastTrack:[],forecastTrack:[]}];
  });
}
export function mergeAgencyStorms(nhc,jma,jtwc) {
  const western = jma.map(storm=>{
    const match=jtwc.find(other=>other.name.toLowerCase()===storm.name.toLowerCase() && Math.abs(other.lat-storm.lat)<3 && Math.abs(other.lon-storm.lon)<5 && Math.abs(Date.parse(other.issuedAt)-Date.parse(storm.issuedAt))<12*3600000);
    return match ? {...storm,windKt:match.windKt,windProvider:'JTWC',windPeriod:'1-minute',windIssuedAt:match.issuedAt,movementKt:match.movementKt,secondarySourceUrl:match.sourceUrl,finalWarning:match.finalWarning} : storm;
  });
  const unmatched=jtwc.filter(storm=>!western.some(other=>other.name.toLowerCase()===storm.name.toLowerCase() && Math.abs(other.lat-storm.lat)<3 && Math.abs(other.lon-storm.lon)<5));
  const remainingNhc=nhc.filter(storm=>!western.some(other=>other.name.toLowerCase()===storm.name.toLowerCase() && Math.abs(other.lat-storm.lat)<3 && Math.abs(((other.lon-storm.lon+540)%360)-180)<5 && Math.abs(Date.parse(other.issuedAt)-Date.parse(storm.issuedAt))<12*3600000));
  return [...remainingNhc,...western,...unmatched];
}
