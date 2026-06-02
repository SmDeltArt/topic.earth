import { createOnlineSignalSnapshot } from './online-layer-signals.js';

export const GOOD_INITIATIVES_WORLD_LAYER_ID = 'good-initiatives-world';
export const GOOD_INITIATIVES_EU_LAYER_ID = 'good-initiatives-eu';
export const GOOD_INITIATIVES_REGIONAL_LAYER_ID = 'community-projects';

const SOURCE_URL = 'https://globaldatalab.org/coact/';

function sourceRecord(name, url, category = 'database') {
  return {
    name,
    url,
    category,
    reliability: category === 'official' ? 'official' : 'needs-review',
    verified: true
  };
}

function makeInitiativeSignal({
  id,
  layerId,
  title,
  source,
  sourceUrl,
  sourceType = 'database',
  lat,
  lon,
  region,
  country,
  summary,
  insight,
  initiativeType,
  communityStatus = 'source-watch',
  engagementTypes = ['learn', 'replicate'],
  fetchedAt
}) {
  return {
    id,
    category: layerId,
    title,
    region,
    country,
    lat,
    lon,
    date: String(fetchedAt).slice(0, 10),
    updatedAt: fetchedAt,
    source,
    sourceUrl,
    sourceName: source,
    sourceType,
    confidence: 'needs-review',
    reviewState: 'runtime',
    severity: 'watch',
    markerColor: '#74c69d',
    markerPriority: layerId === GOOD_INITIATIVES_REGIONAL_LAYER_ID ? 42 : 34,
    summary,
    insight,
    initiativeType,
    communityStatus,
    engagementTypes,
    onlineLayerSignal: true,
    goodInitiativeWatch: {
      scope: layerId === GOOD_INITIATIVES_WORLD_LAYER_ID ? 'world' : (layerId === GOOD_INITIATIVES_EU_LAYER_ID ? 'eu' : 'regional'),
      updateRhythm: 'weekly-monthly',
      publishRule: 'classify source, then review'
    },
    researchSources: [sourceRecord(source, sourceUrl, sourceType)]
  };
}

export function fetchGoodInitiativesSnapshot(options = {}) {
  const fetchedAt = new Date().toISOString();
  const regional = options.regionalContext || {};
  const regionalLat = Number(regional.lat);
  const regionalLon = Number(regional.lon);
  const hasRegional = Number.isFinite(regionalLat) && Number.isFinite(regionalLon);
  const regionalLabel = regional.label || [regional.region, regional.country].filter(Boolean).join(', ') || 'current regional focus';

  const signals = [
    makeInitiativeSignal({
      id: 'good-initiative-world-coact-watch',
      layerId: GOOD_INITIATIVES_WORLD_LAYER_ID,
      title: 'World climate action initiative watch',
      source: 'CoAct Database',
      sourceUrl: 'https://globaldatalab.org/coact/',
      sourceType: 'database',
      lat: 46.2276,
      lon: 2.2137,
      region: 'Global',
      country: 'World',
      summary: 'Runtime watch for verified climate action initiatives linked to SDGs and global stocktake priorities.',
      insight: 'Use this as an evidence source family for hopeful action topics. Publish only after classifying actor, place, action type, source quality and measured/claimed impact.',
      initiativeType: 'Climate Action',
      fetchedAt
    }),
    makeInitiativeSignal({
      id: 'good-initiative-world-un-sdg-watch',
      layerId: GOOD_INITIATIVES_WORLD_LAYER_ID,
      title: 'UN SDG good practices watch',
      source: 'UN SDG Good Practices',
      sourceUrl: 'https://sdgs.un.org/partnerships/good-practices',
      sourceType: 'official',
      lat: 40.7128,
      lon: -74.006,
      region: 'Global',
      country: 'World',
      summary: 'Runtime watch for source-backed sustainable development practices that can counterbalance crisis-heavy climate news.',
      insight: 'Good initiative topics should explain what worked, who did it, where, what evidence confirms it, and whether it can be replicated.',
      initiativeType: 'SDG Practice',
      fetchedAt
    }),
    makeInitiativeSignal({
      id: 'good-initiative-eu-mission-watch',
      layerId: GOOD_INITIATIVES_EU_LAYER_ID,
      title: 'EU climate mission and funding watch',
      source: 'European Commission climate action',
      sourceUrl: 'https://climate.ec.europa.eu/index_en',
      sourceType: 'official',
      lat: 50.8503,
      lon: 4.3517,
      region: 'Brussels',
      country: 'Belgium',
      summary: 'Runtime watch for EU climate action, funding calls, missions, adaptation, circular economy and implementation programs.',
      insight: 'Use this for EU-level hopeful implementation signals. A publishable topic should identify the program, beneficiary/action, timing, source and practical limits.',
      initiativeType: 'EU Program',
      fetchedAt
    }),
    makeInitiativeSignal({
      id: 'good-initiative-eu-urban-watch',
      layerId: GOOD_INITIATIVES_EU_LAYER_ID,
      title: 'European sustainable city initiative watch',
      source: 'European Commission urban initiatives',
      sourceUrl: 'https://urban.jrc.ec.europa.eu/',
      sourceType: 'official',
      lat: 48.8566,
      lon: 2.3522,
      region: 'Europe',
      country: 'European Union',
      summary: 'Runtime watch for European city and regional transition examples that can feed local/regional topic ideas.',
      insight: 'This is a hopeful bridge between EU policy and regional action: city missions, adaptation, mobility, circularity, nature and energy communities.',
      initiativeType: 'Urban Transition',
      fetchedAt
    })
  ];

  signals.push(makeInitiativeSignal({
    id: hasRegional ? `good-initiative-regional-${String(regionalLabel).toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : 'good-initiative-regional-focus-watch',
    layerId: GOOD_INITIATIVES_REGIONAL_LAYER_ID,
    title: `Regional initiative watch near ${regionalLabel}`,
    source: 'Open regional initiative source watch',
    sourceUrl: 'https://www.google.com/search?q=' + encodeURIComponent(`${regionalLabel} climate action repair cafe energy cooperative local sustainability official`),
    sourceType: 'official-search',
    lat: hasRegional ? regionalLat : 50.8503,
    lon: hasRegional ? regionalLon : 4.3517,
    region: regional.region || regionalLabel,
    country: regional.country || 'Local region',
    summary: `Runtime watch for local hopeful actions near ${regionalLabel}: repair/reuse, energy communities, water, biodiversity, mobility, gardening and adaptation.`,
    insight: 'This search-helper source is not publishable evidence by itself. Replace it with an organizer, municipality, cooperative, official program or database link before publication.',
    initiativeType: 'Local Action',
    communityStatus: 'needs-source',
    engagementTypes: ['join', 'learn', 'volunteer'],
    fetchedAt
  }));

  return createOnlineSignalSnapshot({
    id: 'good-initiatives-watch',
    layerId: GOOD_INITIATIVES_WORLD_LAYER_ID,
    sourceStatus: 'runtime-source-watch',
    sourceUrl: SOURCE_URL,
    sourceName: 'Good initiatives watch',
    fetchedAt,
    signals
  });
}
