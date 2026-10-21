// Regional dashboard for official Meteoalarm country warning feeds.
// Not a geospatial CAP warning overlay: no claim of local impact without polygons.
export const REGIONAL_WIND_LAYER_ID = 'regional-wind-watch';

const html = value => String(value ?? '').replace(/[&<>"']/g, c => ({
  '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
})[c]);
const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  .replace(/[^a-z0-9]+/gi,' ').toLowerCase().trim();
const COUNTRIES = ['en','fr','nl','de','es','it','pt','pl'];
const EXTRA_ALIASES = {
  BE:['belgie','belgique','belgien'],NL:['nederland','pays bas','niederlande'],
  GB:['uk','great britain','united kingdom of great britain and northern ireland','royaume uni','vereinigtes konigreich'],
  DE:['deutschland','allemagne'],FR:['frankreich','francia'],CH:['schweiz','suisse','svizzera'],
  IE:['eire','irlande'],AT:['osterreich','autriche'],LU:['luxemburg'],
  CZ:['czech republic','republique tcheque'],GR:['hellas','grece']
};

export function findEuropeanStormCountry(snapshot, context) {
  if (!Array.isArray(snapshot?.countries) || !context) return null;
  const code=String(context.countryCode || context.country_code || '').trim().toUpperCase().replace(/^UK$/,'GB');
  if (/^[A-Z]{2}$/.test(code)) {
    const byCode=snapshot.countries.find(c=>c.id===code);
    if(byCode)return byCode;
  }
  const countryName=normalize(context.country);
  const lastPart=normalize(String(context.label || '').split(',').at(-1));
  if (!countryName && !lastPart) return null;

  return snapshot.countries.find(country=>{
    const aliases=new Set([normalize(country.name),normalize(country.id),...(EXTRA_ALIASES[country.id]||[]).map(normalize)]);
    for(const lang of COUNTRIES) {
      try {
        const display = new Intl.DisplayNames([lang],{type:'region'}).of(country.id==='GB'?'GB':country.id);
        if(display)aliases.add(normalize(display));
      } catch { /* Intl.DisplayNames is optional on older browsers. */ }
    }
    return aliases.has(countryName) || (!countryName && aliases.has(lastPart));
  }) || null;
}

function areaMention(warning, context) {
  // A textual clue is NOT proof that the user's coordinates lie in a CAP area.
  const area=normalize(warning?.area);
  return [context?.region,context?.city].some(name=>{
    const key=normalize(name);
    return key.length>=5 && area.includes(key);
  });
}
const guide = (title,body,link='https://www.meteoalarm.org/') =>
  '<article style="font:16px/1.65 system-ui;background:#0a1e2b;color:#e7f4f9;padding:16px;border-radius:12px">'
    + '<h1 style="color:#8bd5fa">🌬️ '+html(title)+'</h1>'+body
    +'<p><a target="_blank" rel="noopener noreferrer" href="'+html(link)+'">Official Meteoalarm warning map ↗</a></p>'
    +'<p><small>Country-feed notices are informational, not a local hazard assessment. For emergencies follow national authorities.</small></p></article>';
const when=value => value ? html(value.replace('T',' ').replace(/\.\d+Z$/,' UTC')) : 'not supplied';

export function buildRegionalWindWatchTopics(snapshot, context = null) {
  const validContext=context && Number.isFinite(Number(context.lat))
    && Number.isFinite(Number(context.lon))
    && Math.abs(Number(context.lat))<=90 && Math.abs(Number(context.lon))<=180;
  const date=String(snapshot?.fetchedAt || new Date().toISOString()).slice(0,10);
  const base={category:REGIONAL_WIND_LAYER_ID,date,language:'en',source:'EUMETNET Meteoalarm · national services',
    isRegionalStormWatch:true,isCustom:false,onlineLayerSignal:true,sourceType:'Official European warning desk',
    markerColor:'#80ccf5',markerPriority:1,locationPrecision:'region'};
  if(!validContext) {
    return [{
      ...base,id:'regional-wind-location-needed',title:'🌬️ Regional wind watch · select location',
      hideGlobeMarker:true,region:'Choose a town or municipality',country:'',
      summary:'Set your municipality in Regional search or Settings to find the corresponding national warning service.',
      topicStory:{enabled:true,themeMode:'regional',html:guide('Choose a regional location',
        '<p>Set a country and municipality using Regional search or Settings. Country feeds never establish that a warning applies to an exact address.</p>')}
    }];
  }
  const anchor={lat:Number(context.lat),lon:Number(context.lon)};
  const country=findEuropeanStormCountry(snapshot,context);
  const label=String(context.label || context.city || context.region || 'Selected regional location').slice(0,160);
  const shared={...base,...anchor,region:String(context.region || context.city || label).slice(0,120),
    country:country?.name || String(context.country||'Selected location').slice(0,100),
    hideGlobeMarker:true,locationNotes:'Map pin is your selected Regional watch reference point, NOT the location or extent of a wind alert.'};
  if(!country) {
    const missing=!snapshot?.countries?.length;
    return [{
      ...shared,id:'regional-wind-coverage',title:'🌬️ Regional wind watch · '+(missing?'waiting for feeds':'location coverage'),
      summary:missing?'Checking Meteoalarm country coverage…':'No supported country feed matched this location. This does not mean there is no weather risk.',
      topicStory:{enabled:true,themeMode:'regional',html:guide(
        missing?'Checking weather source availability':'Country feed unavailable for this location',
        '<p>Focus: '+html(label)+'. '+(missing?'Feed data has not loaded yet.':'Check the official weather service for your selected region.')+'</p>')}
    }];
  }
  const ordered=[...(country.warnings || [])].sort((a,b)=>Number(areaMention(b,context))-Number(areaMention(a,context)));
  const total=ordered.length;
  const status=country.ok?'checked':'unavailable';
  const areaItems=ordered.map(w=>{
    const possible=areaMention(w,context);
    return '<li style="margin:10px 0;padding:8px;background:#16354a;border-radius:8px"><strong>'
      +html(w.severity)+' · '+html(w.event || w.headline)+'</strong><br>Official described area: '
      +html(w.area || 'unspecified')+(possible?' <em>(area name resembles selected region; not position-verified)</em>':'')
      +'<br>Begins: '+when(w.onset)+' · Expires: '+when(w.expires)
      +'</li>';
  }).join('');
  const headline=country.ok ? total+' official wind notice(s) for '+country.name : 'Country warning source unavailable';
  const body='<p><strong>Focus:</strong> '+html(label)+' · <strong>Feed:</strong> '+html(country.name)
    +' · <strong>Status:</strong> '+html(status)+' · checked '+when(snapshot?.fetchedAt)+'</p>'
    +'<p style="padding:12px;background:#34302b;border-left:4px solid #ffcb7a"><strong>Regional precision:</strong> '
    +'These warnings are filtered by COUNTRY, not by municipal coordinates. An area name may or may not contain your location; no official alert polygon is available through this view. '
    +'Do not interpret a pin or a notice count as confirmation that this municipality is under warning.</p>'
    +(country.ok
      ? (total?'<h2>Published wind notices · '+total+'</h2><ul>'+areaItems+'</ul>'
        :'<p>No relevant wind notices were parsed in this successfully accessed country feed at the last check. This is not proof of safe conditions.</p>')
      :'<p>The country feed could not be read. Please use the official authority directly; cached data is not presented as current.</p>')
    +'<p><a href="'+html(country.officialUrl)+'" rel="noopener noreferrer" target="_blank">Official '+html(country.name)+' weather warnings ↗</a></p>'
    +'<p><small>Data: EUMETNET / Meteoalarm, attribution retained. National agencies provide official instructions. Updates checked while the Regional watch layer is active.</small></p>';
  return [{
    ...shared,id:'regional-wind-'+country.id,title:'🌬️ '+country.name+' · Regional wind watch',
    summary:country.ok ? headline+' · regional impact not verified.' : 'Source unavailable · consult the national meteorological service.',
    updatedAt:snapshot?.fetchedAt || date, warningCount:country.ok?total:null,regionalCountryCode:country.id,
    researchSources:[{name:country.name+' · national weather service',url:country.officialUrl,category:'official'},
      {name:'Meteoalarm · European warning map',url:'https://www.meteoalarm.org/',category:'official'}],
    topicStory:{enabled:true,themeMode:'regional',title:country.name+' · Regional wind watch',html:guide(
      country.name+' · Regional wind watch',body,country.officialUrl)}
  }];
}
