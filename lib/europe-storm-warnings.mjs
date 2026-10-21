// Country-level European wind-warning watch. These are alerts, not storm-centre tracks.
export const EUROPE_STORM_LAYER_ID = 'atlantic-storms';
export const EUROPE_STORM_COUNTRIES = Object.freeze([
  ['IE','Ireland','ireland',53.35,-6.26,'https://www.met.ie/warnings/today'],
  ['GB','United Kingdom','united-kingdom',51.51,-0.13,'https://weather.metoffice.gov.uk/warnings-and-advice/uk-warnings'],
  ['FR','France','france',48.86,2.35,'https://vigilance.meteofrance.fr/fr'],
  ['BE','Belgium','belgium',50.85,4.35,'https://www.meteo.be/en/weather/warnings/overview-map'],
  ['NL','Netherlands','netherlands',52.08,4.31,'https://www.knmi.nl/nederland-nu/weer/waarschuwingen'],
  ['DE','Germany','germany',52.52,13.41,'https://www.dwd.de/EN/weather/warnings/warnings_node.html'],
  ['LU','Luxembourg','luxembourg',49.61,6.13,'https://www.meteolux.lu/'],
  ['DK','Denmark','denmark',55.68,12.57,'https://www.dmi.dk/'],
  ['NO','Norway','norway',59.91,10.75,'https://www.met.no/en'],
  ['SE','Sweden','sweden',59.33,18.07,'https://www.smhi.se/en/weather/warnings'],
  ['FI','Finland','finland',60.17,24.94,'https://en.ilmatieteenlaitos.fi/warnings'],
  ['IS','Iceland','iceland',64.15,-21.94,'https://en.vedur.is/alerts'],
  ['ES','Spain','spain',40.42,-3.7,'https://www.aemet.es/en/eltiempo/prediccion/avisos'],
  ['PT','Portugal','portugal',38.72,-9.14,'https://www.ipma.pt/en/otempo/prev-sam/'],
  ['IT','Italy','italy',41.9,12.49,'https://www.meteoam.it/'],
  ['CH','Switzerland','switzerland',46.95,7.45,'https://www.meteoswiss.admin.ch/weather/warnings-and-hazards.html'],
  ['AT','Austria','austria',48.21,16.37,'https://warnungen.zamg.at/'],
  ['PL','Poland','poland',52.23,21.01,'https://meteo.imgw.pl/'],
  ['CZ','Czechia','czechia',50.08,14.44,'https://www.chmi.cz/'],
  ['SK','Slovakia','slovakia',48.15,17.11,'https://www.shmu.sk/'],
  ['HU','Hungary','hungary',47.5,19.04,'https://www.met.hu/'],
  ['SI','Slovenia','slovenia',46.05,14.51,'https://meteo.arso.gov.si/'],
  ['HR','Croatia','croatia',45.81,15.98,'https://meteo.hr/'],
  ['RO','Romania','romania',44.43,26.1,'https://www.meteoromania.ro/'],
  ['BG','Bulgaria','bulgaria',42.7,23.32,'https://www.meteo.bg/'],
  ['GR','Greece','greece',37.98,23.73,'https://www.emy.gr/'],
  ['CY','Cyprus','cyprus',35.17,33.36,'https://www.moa.gov.cy/moa/ms/ms.nsf/index_en/index_en?OpenDocument'],
  ['EE','Estonia','estonia',59.44,24.75,'https://www.ilmateenistus.ee/?lang=en'],
  ['LV','Latvia','latvia',56.95,24.11,'https://www.meteo.lv/'],
  ['LT','Lithuania','lithuania',54.69,25.28,'https://www.meteo.lt/'],
  ['MT','Malta','malta',35.9,14.51,'https://www.maltairport.com/weather/']
].map(([id,name,slug,lat,lon,officialUrl]) => Object.freeze({
  id,name,slug,lat,lon,officialUrl,
  feedUrl:'https://feeds.meteoalarm.org/feeds/meteoalarm-legacy-atom-' + slug
})));

const WINDS = /wind|gust|gale|storm|sturm|st[oö]rm|vent|rafal|viento|vento|vihar|k[eé]nt|wiatr|v[eé]nt|vinds|tuul|ветер|vi[eé]jo/i;
const clean = value => String(value || '').replace(/\s+/g,' ').trim().slice(0,320);
function decodeXml(value) {
  return String(value || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1')
    .replace(/&#(x[0-9a-f]+|\d+);/gi,(whole,code) => {
      const n=code[0].toLowerCase()==='x' ? parseInt(code.slice(1),16) : Number(code);
      return n>0 && n<=0x10ffff ? String.fromCodePoint(n) : '';
    }).replace(/&(?:amp|lt|gt|quot|apos);/g,x=>({ '&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"', '&apos;':"'" }[x]))
    .replace(/<[^>]*>/g,'');
}
function field(xml,tag) {
  // Atom entries include CAP fields such as <cap:areaDesc>. Prefixes are ignored.
  const m=String(xml).match(new RegExp('<(?:[a-z0-9._-]+:)?' + tag + '(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[a-z0-9._-]+:)?' + tag + '\\s*>','i'));
  return clean(decodeXml(m?.[1] || ''));
}
function iso(value) {
  if (!value || !/^\d{4}-\d\d-\d\dT/.test(value)) return '';
  const t=Date.parse(value);
  return Number.isFinite(t) ? new Date(t).toISOString() : '';
}
function capLink(fragment,feedUrl) {
  // Only refer to a verified provider host; never chase untrusted feed-provided URLs.
  const tags=fragment.match(/<link\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const href=tag.match(/\bhref=["']([^"']+)["']/i)?.[1];
    const type=tag.match(/\btype=["']([^"']+)["']/i)?.[1] || '';
    if (!href || !/application\/cap\+xml/i.test(type)) continue;
    try { const u=new URL(href,feedUrl); if(u.protocol==='https:' && u.hostname==='feeds.meteoalarm.org')return u.href; } catch {}
  }
  return feedUrl;
}
export function parseWindAtom(xml,{now=Date.now(),feedUrl='https://feeds.meteoalarm.org/'}={}) {
  const feed=String(xml||'');
  if (!/<(?:[a-z0-9._-]+:)?feed[\s>]/i.test(feed)) throw new Error('Unexpected Atom feed format');
  if(feed.length>1_000_000)throw new Error('Feed exceeds size limit');
  const entries=feed.match(/<(?:[a-z0-9._-]+:)?entry(?:\s[^>]*)?>[\s\S]*?<\/(?:[a-z0-9._-]+:)?entry>/gi) || [];
  const distinct=new Map();
  for(const entry of entries.slice(0,280)) {
    const event=field(entry,'event') || field(entry,'title');
    const title=field(entry,'title') || event;
    const area=field(entry,'areaDesc');
    const text=field(entry,'summary') || field(entry,'description');
    const expiry=iso(field(entry,'expires'));
    const onset=iso(field(entry,'onset') || field(entry,'effective'));
    const updatedAt=iso(field(entry,'updated'));
    const status=field(entry,'status');
    const messageType=field(entry,'msgType');
    const severity=field(entry,'severity') || 'Unknown';
    if (/test|exercise|draft|system/i.test(status) || /cancel|error|ack/i.test(messageType))continue;
    if (!WINDS.test([event,title,text].join(' ')))continue;
    // Incomplete/undated entries are not safe to describe as active warnings.
    if (!expiry || Date.parse(expiry)<now || Date.parse(expiry)>now+14*86400000)continue;
    if(onset && Date.parse(onset)>now+14*86400000)continue;
    const warning={event,headline:title,area:area||'Area unspecified',severity,
      onset,expires:expiry,updatedAt,url:capLink(entry,feedUrl)};
    const key=[event,warning.area,warning.expires,severity].join('|');
    distinct.set(key,warning);
  }
  return [...distinct.values()].slice(0,30);
}
export async function fetchEuropeanWindWarnings({fetchImpl=globalThis.fetch,now=Date.now(),countries=EUROPE_STORM_COUNTRIES}={}) {
  const fetchedAt=new Date(now).toISOString();
  const results=await Promise.all(countries.map(async country=>{
    const info={...country,ok:false,checkedAt:fetchedAt,warnings:[],error:''};
    try {
      const response=await fetchImpl(country.feedUrl,{
        headers:{Accept:'application/atom+xml, application/xml;q=0.9'},
        signal:AbortSignal.timeout(8000)
      });
      if(!response.ok)throw new Error('Feed HTTP '+response.status);
      const size=Number(response.headers?.get?.('content-length')||0);
      if(size>1_000_000)throw new Error('Feed too large');
      const xml=await response.text();
      info.warnings=parseWindAtom(xml,{now,feedUrl:country.feedUrl});
      info.ok=true;
    }catch(error){
      info.error=clean(error?.message||'Feed unavailable').slice(0,90);
    }
    return info;
  }));
  const successful=results.filter(x=>x.ok).length;
  const warningCount=results.reduce((n,c)=>n+c.warnings.length,0);
  return {version:1,fetchedAt,source:'EUMETNET MeteoAlarm Atom/CAP (CC BY 4.0)',
    status:successful===countries.length?'ok':successful?'partial':'unavailable',
    successful,checked:results.length,warningCount,countries:results,
    coverage:'Country warning feeds (31 European states). CAP alerts are NOT named-storm tracks or a guarantee of conditions at each country marker. Missing sources mean unavailable, not no risk.'};
}
