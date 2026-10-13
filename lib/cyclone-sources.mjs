import { SOURCES, parseNhc, parseAtcf, parseJma, parseJtwc, mergeAgencyStorms } from './cyclone-data.mjs';

export async function fetchCycloneSnapshot({fetchImpl = globalThis.fetch,now = Date.now()} = {}) {
  const fetchedAt = new Date(now).toISOString();
  const read = async (url,json = false) => {
    const response = await fetchImpl(url,{signal:AbortSignal.timeout(8000),headers:{Accept:json?'application/json':'text/plain'}});
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const text = await response.text();
    if (text.length > 2*1024*1024) throw new Error('Upstream response too large');
    return json ? JSON.parse(text) : text;
  };
  const initial = await Promise.allSettled([read(SOURCES.nhc,true),read(SOURCES.jma,true),read(SOURCES.jtwc),read(SOURCES.jtwcIndian)]);
  const sources = Object.fromEntries(['nhc','jma','jtwc'].map((id,index)=>[id,{ok:initial[index].status === 'fulfilled',checkedAt:fetchedAt,error:initial[index].status === 'rejected' ? String(initial[index].reason?.message || 'Source unavailable').slice(0,100) : ''}]));
  let nhc=[],jma=[],jtwc=[];
  if (sources.nhc.ok) {
    try { nhc=parseNhc(initial[0].value); } catch(error) {sources.nhc.ok=false;sources.nhc.error=error.message;}
  }
  sources.jtwc.regions={pacific:false,indian:false};
  for (const [index,region,url] of [[2,'pacific',SOURCES.jtwc],[3,'indian',SOURCES.jtwcIndian]]) {
    try {
      if(initial[index].status !== 'fulfilled') throw initial[index].reason;
      if (!String(initial[index].value).includes('TROPICAL CYCLONE SUMMARY:')) throw new Error('Unrecognised JTWC summary');
      jtwc.push(...parseJtwc(initial[index].value,url));sources.jtwc.regions[region]=true;
    } catch(error) {sources.jtwc.error=`${region}: ${error.message}`;}
  }
  sources.jtwc.ok=sources.jtwc.regions.pacific && sources.jtwc.regions.indian;
  const enrichment = nhc.map(async storm=>{
    const base=`https://ftp.nhc.noaa.gov/atcf/`;
    const result=await Promise.allSettled([read(`${base}btk/b${storm.agencyId}.dat`),read(`${base}fst/${storm.agencyId}.fst`)]);
    if(result[0].status === 'fulfilled') {
      const parsed=parseAtcf(result[0].value);
      storm.windExtents=parsed.windExtents;
      storm.pastTrack=parsed.points.filter(p=>p.validAt<=storm.issuedAt);
      storm.pastTrack.push({lat:storm.lat,lon:storm.lon,validAt:storm.issuedAt});
    }
    if(result[1].status === 'fulfilled') {
      const parsed=parseAtcf(result[1].value,'OFCL');
      storm.forecastTrack=parsed.points.filter(p=>p.validAt>storm.issuedAt);
      storm.forecastIssuedAt=parsed.issuedAt;
    }
    storm.trackSourceUrl=`${base}btk/b${storm.agencyId}.dat`;
    storm.forecastSourceUrl=`${base}fst/${storm.agencyId}.fst`;
    storm.detailUnavailable=result.some(item=>item.status === 'rejected');
  });
  const jmaEnrichment = [];
  if(sources.jma.ok) {
    if(!Array.isArray(initial[1].value)) {sources.jma.ok=false;sources.jma.error='Invalid JMA target list';}
    else for(const entry of initial[1].value.slice(0,20)) {
      if(!/^TC\d{4}$/.test(entry.tropicalCyclone || '')) {sources.jma.ok=false;sources.jma.error='Invalid JMA cyclone ID';continue;}
      jmaEnrichment.push((async()=>{
        try {jma.push(parseJma(entry,await read(`https://www.jma.go.jp/bosai/typhoon/data/${entry.tropicalCyclone}/forecast.json`,true)));}
        catch(error) {sources.jma.ok=false;sources.jma.error=error.message;}
      })());
    }
  }
  await Promise.allSettled([...enrichment,...jmaEnrichment]);
  const storms=mergeAgencyStorms(nhc,jma,jtwc);
  return {version:1,fetchedAt,sources,storms,coverage:'Worldwide watch of the principal tropical cyclone basins. NHC: North Atlantic and eastern/central North Pacific; JMA: western North Pacific; JTWC: western/southern Pacific, Australian region, North and South Indian Ocean. Exceptional South Atlantic systems are outside these feeds. Missing coverage or a failed source does not mean there are no storms.'};
}
