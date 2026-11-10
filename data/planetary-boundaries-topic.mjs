const CONTROLLER = '/assets/topics/planetary-boundaries/index.html';
const ARTWORK = '/assets/topics/planetary-boundaries/assets/planetary-boundaries.svg';

export const PLANETARY_BOUNDARIES_TOPICS = [{
  id: 'planetary-boundaries-monitor',
  planetaryTopicOrder: 1,
  category: 'planetary-boundaries',
  title: 'Planetary Boundaries · Earth Health Monitor',
  lat: 0,
  lon: 0,
  country: 'Global',
  region: 'Earth system · global assessment',
  date: '2026-09-21',
  language: 'en',
  translationFiles: Object.fromEntries(['en','fr','nl','de'].map(language=>[language,{url:`/assets/topics/planetary-boundaries/translations/${language}.json`,version:'v002'}])),
  scientificVisualization: {
    schemaVersion: 1,
    type: 'planetary-boundaries',
    controllerUrl: CONTROLLER,
    indicatorMapUrl: '/assets/topics/planetary-boundaries/data/indicator-map.json',
    assessmentRegistryUrl: '/assets/topics/planetary-boundaries/data/assessment-registry.json',
    sourceRegistryUrl: '/assets/topics/planetary-boundaries/data/source-registry.json',
    translationSource: 'translationFiles[language].visualization',
    exportType: 'topic_earth_planetary_boundaries_export',
    exportSchemaVersion: 2
  },
  source: 'Planetary Boundaries Science · Planetary Health Check 2026',
  summary: 'Explore nine planetary boundaries and 13 SVG indicator channels. The 2026 assessment reports seven global boundaries exceeded. Explore source-checked 2023–2026 assessments, scientific units, uncertainty and explicitly documented boundary-relative ratios; manual slider values remain illustrative.',
  insight: '<p>This independent World topic presents the dated Planetary Health Check assessment. Five tabs present versioned report data and methodology; manual controls change a local illustration only.</p><p><a href="' + CONTROLLER + '" target="_blank" rel="noopener noreferrer">Open the SVG controller in full view</a></p><p>Automatic scientific monitoring and Master Admin review/publishing are not connected yet.</p>',
  locationNotes: 'The marker at 0°, 0° is a schematic anchor for a global topic, not a local measurement station.',
  isCustom: false,
  mediaImages: [ARTWORK],
  mediaTokens: [{
    id: 'planetary-boundaries-svg-controller',
    mediaType: 'iframe',
    provider: 'topic-earth',
    url: ARTWORK,
    thumbnailUrl: ARTWORK,
    embedUrl: CONTROLLER,
    sourceUrl: CONTROLLER,
    sourceName: 'Planetary Boundaries · interactive SVG controller',
    watermarkText: 'Versioned scientific assessments · illustrative controls are labeled',
    autoplay: false,
    generated: false
  }],
  researchSources: [{
    name: 'Planetary Health Check 2026 · official assessment and downloads',
    url: 'https://www.planetaryhealthcheck.org/downloads/',
    category: 'scientific',
    verified: true,
    reliability: 'high',
    checkedAt: '2026-11-04',
    notes: 'Source table 7.1 checked for the 2026 snapshot. Project-derived ratios are separate from published values and visual radii. Historical reports retain their own definitions and uncertainty.'
  }]
}, {
  id:'planetary-boundaries-cop',planetaryTopicOrder:2,category:'planetary-boundaries',
  title:'COP21 → COP31 — Commitments & Achievements',
  lat:0,lon:2,country:'Global',region:'Climate diplomacy · independent monitoring',date:'2026-11-10',language:'en',isCustom:false,
  summary:'Explore COP21–COP31 commitments, documented implementation and independently measured environmental outcomes. Conference years never substitute for scientific assessments; COP31 outcomes remain pending official adoption.',
  insight:'<p>Use the conference selector to compare agreements and remaining gaps. An optional progress marker links comparable regional observations to the shared planetary-boundaries chart, without changing its scientific values or attributing recovery to a COP.</p>',
  source:'UNFCCC · United Nations · NASA Ozone Watch · WMO',
  translationFiles:Object.fromEntries(['en','fr','nl','de'].map(language=>[language,{url:`/assets/topics/planetary-boundaries/translations/cop-${language}.json`,version:'v001'}])),
  scientificVisualization:{schemaVersion:1,type:'planetary-boundaries-cop',controllerUrl:CONTROLLER+'?topic=cop',
    indicatorMapUrl:'/assets/topics/planetary-boundaries/data/indicator-map.json',assessmentRegistryUrl:'/assets/topics/planetary-boundaries/data/assessment-registry.json',
    conferenceDataUrl:'/assets/topics/planetary-boundaries/data/cop-conferences.mjs'},
  locationNotes:'Schematic global-topic anchor, not a local measurement station or COP venue.',
  mediaImages:[ARTWORK],mediaTokens:[{id:'cop-boundaries-controller',mediaType:'iframe',provider:'topic-earth',url:ARTWORK,thumbnailUrl:ARTWORK,
    embedUrl:CONTROLLER+'?topic=cop',sourceUrl:CONTROLLER+'?topic=cop',sourceName:'COP21–COP31 · shared scientific SVG',watermarkText:'Policy commitments ≠ measured environmental outcomes',autoplay:false,generated:false}],
  researchSources:[{name:'UNFCCC · COP31 and official conference archive',url:'https://unfccc.int/cop31',category:'official',verified:true,reliability:'high',checkedAt:'2026-11-10',notes:'Conference dates and agenda; COP31 outcomes pending. Other dated sources appear in each conference record.'}]
}];
