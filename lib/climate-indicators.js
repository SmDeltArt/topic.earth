import { createOnlineSignalSnapshot } from './online-layer-signals.js';

export const CLIMATE_LAYER_ID = 'climate';

const NASA_GISTEMP_URL = 'https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.txt';
const NOAA_CO2_URL = 'https://gml.noaa.gov/webdata/ccgg/trends/co2/co2_mm_mlo.csv';
const COPERNICUS_INDICATORS_URL = 'https://climate.copernicus.eu/climate-indicators/about-data';
const WMO_STATE_OF_CLIMATE_URL = 'https://wmo.int/publication-series/state-of-climate-update-cop';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function classifyTemperatureAnomaly(valueC) {
  if (valueC >= 1.2) return 'severe';
  if (valueC >= 1.0) return 'warning';
  if (valueC >= 0.7) return 'notable';
  return 'watch';
}

function classifyCo2(valuePpm) {
  if (valuePpm >= 430) return 'severe';
  if (valuePpm >= 425) return 'warning';
  if (valuePpm >= 420) return 'notable';
  return 'watch';
}

function parseGistempText(text = '') {
  const rows = text.split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => /^\d{4}\s+/.test(line));

  for (let rowIndex = rows.length - 1; rowIndex >= 0; rowIndex -= 1) {
    const cells = rows[rowIndex].split(/\s+/);
    const year = Number(cells[0]);
    if (!Number.isFinite(year)) continue;

    for (let monthIndex = 11; monthIndex >= 0; monthIndex -= 1) {
      const raw = cells[monthIndex + 1];
      const value = Number(raw);
      if (!Number.isFinite(value) || raw === '***' || raw === '****') continue;

      return {
        year,
        monthIndex,
        month: MONTHS[monthIndex],
        valueC: value / 100
      };
    }
  }

  return null;
}

function parseNoaaCo2Csv(text = '') {
  const rows = text.split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'));

  for (let index = rows.length - 1; index >= 0; index -= 1) {
    const cells = rows[index].split(',').map(cell => cell.trim());
    const year = Number(cells[0]);
    const month = Number(cells[1]);
    const average = Number(cells[3]);
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(average) || average < 0) continue;

    return {
      year,
      monthIndex: month - 1,
      month: MONTHS[month - 1] || String(month).padStart(2, '0'),
      valuePpm: average
    };
  }

  return null;
}

async function fetchText(fetchImpl, url) {
  const response = await fetchImpl(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`${url} responded ${response.status}`);
  return response.text();
}

function fallbackClimateSignals(fetchedAt) {
  return [
    {
      id: 'climate-reference-copernicus-indicators',
      title: 'Climate indicators source watch',
      region: 'Global',
      country: 'World',
      lat: 0,
      lon: 0,
      summary: 'Copernicus climate indicators are registered as the primary source family for global temperature, sea level, greenhouse gas and cryosphere runtime checks.',
      insight: '<p><strong>Status:</strong> source registry ready.</p><p><strong>Next:</strong> connect dataset-specific fetchers and keep generated topics in review until measured values are attached.</p>',
      source: 'Copernicus Climate Change Service',
      sourceUrl: COPERNICUS_INDICATORS_URL,
      sourceName: 'Copernicus Climate Indicators',
      sourceType: 'scientific',
      confidence: 'needs-review',
      reviewState: 'runtime',
      severity: 'watch',
      updatedAt: fetchedAt,
      climateIndicator: { indicator: 'source-registry', value: null, unit: '', baseline: '' }
    },
    {
      id: 'climate-reference-wmo-state',
      title: 'State of climate report watch',
      region: 'Global',
      country: 'World',
      lat: 12,
      lon: -25,
      summary: 'WMO State of the Climate updates should feed yearly climate topics, COP context, and global indicator summaries.',
      insight: '<p><strong>Status:</strong> official report source registered.</p><p><strong>Use:</strong> annual and COP-period updates, not hourly live weather.</p>',
      source: 'World Meteorological Organization',
      sourceUrl: WMO_STATE_OF_CLIMATE_URL,
      sourceName: 'WMO State of the Climate',
      sourceType: 'official',
      confidence: 'needs-review',
      reviewState: 'runtime',
      severity: 'watch',
      updatedAt: fetchedAt,
      climateIndicator: { indicator: 'state-of-climate', value: null, unit: '', baseline: '' }
    }
  ];
}

function climateStudyWatchSignal(fetchedAt) {
  return {
    id: 'climate-studies-watch-wmo-copernicus',
    title: 'Latest climate studies and indicators watch',
    region: 'Global',
    country: 'World',
    lat: 34,
    lon: 12,
    summary: 'Runtime watch for official climate indicator updates and high-quality climate reports. Use this to draft reviewed Climate Change topics from Copernicus, WMO, NOAA, NASA or peer-reviewed study evidence.',
    insight: '<p><strong>Purpose:</strong> source queue for Climate Change auto-updates.</p><p><strong>Rule:</strong> measured indicators can update automatically; attribution and study narratives need source review before publication.</p>',
    source: 'Copernicus / WMO climate source watch',
    sourceUrl: COPERNICUS_INDICATORS_URL,
    sourceName: 'Climate studies and indicators watch',
    sourceType: 'scientific',
    confidence: 'needs-review',
    reviewState: 'runtime',
    severity: 'watch',
    updatedAt: fetchedAt,
    markerPriority: 22,
    climateIndicator: { indicator: 'climate-studies-watch', value: null, unit: '', baseline: '' },
    researchSources: [
      { name: 'Copernicus Climate Indicators', url: COPERNICUS_INDICATORS_URL, type: 'scientific', reliability: 'high' },
      { name: 'WMO State of the Climate', url: WMO_STATE_OF_CLIMATE_URL, type: 'official', reliability: 'high' }
    ]
  };
}

function temperatureSignal(latest, fetchedAt) {
  const date = `${latest.year}-${String(latest.monthIndex + 1).padStart(2, '0')}-01`;
  return {
    id: `climate-gistemp-global-temperature-${latest.year}-${String(latest.monthIndex + 1).padStart(2, '0')}`,
    title: `Global temperature anomaly update (${latest.month} ${latest.year})`,
    region: 'Global',
    country: 'World',
    lat: 0,
    lon: 0,
    date,
    updatedAt: fetchedAt,
    summary: `NASA GISTEMP reports a global land-ocean temperature anomaly of ${latest.valueC.toFixed(2)} deg C versus the 1951-1980 baseline for ${latest.month} ${latest.year}.`,
    insight: `<p><strong>Indicator:</strong> NASA GISTEMP global land-ocean temperature anomaly</p><p><strong>Latest value:</strong> ${latest.valueC.toFixed(2)} deg C vs 1951-1980</p><p><strong>Period:</strong> ${latest.month} ${latest.year}</p><p><em>Measured climate indicator. Review source before publishing a narrative topic.</em></p>`,
    source: 'NASA GISS GISTEMP v4',
    sourceUrl: NASA_GISTEMP_URL,
    sourceName: 'NASA GISTEMP v4',
    sourceType: 'scientific',
    confidence: 'measured',
    reviewState: 'runtime',
    severity: classifyTemperatureAnomaly(latest.valueC),
    climateIndicator: {
      indicator: 'global-temperature-anomaly',
      value: latest.valueC,
      unit: 'deg C',
      baseline: '1951-1980'
    }
  };
}

function co2Signal(latest, fetchedAt) {
  const date = `${latest.year}-${String(latest.monthIndex + 1).padStart(2, '0')}-01`;
  return {
    id: `climate-noaa-co2-mauna-loa-${latest.year}-${String(latest.monthIndex + 1).padStart(2, '0')}`,
    title: `Atmospheric CO2 update (${latest.month} ${latest.year})`,
    region: 'Mauna Loa',
    country: 'United States',
    lat: 19.5362,
    lon: -155.5763,
    date,
    updatedAt: fetchedAt,
    summary: `NOAA GML Mauna Loa monthly mean CO2 is ${latest.valuePpm.toFixed(2)} ppm for ${latest.month} ${latest.year}.`,
    insight: `<p><strong>Indicator:</strong> NOAA GML Mauna Loa monthly mean CO2</p><p><strong>Latest value:</strong> ${latest.valuePpm.toFixed(2)} ppm</p><p><strong>Period:</strong> ${latest.month} ${latest.year}</p><p><em>Preliminary recent values may be revised by NOAA quality control.</em></p>`,
    source: 'NOAA Global Monitoring Laboratory',
    sourceUrl: NOAA_CO2_URL,
    sourceName: 'NOAA GML Mauna Loa CO2 monthly mean',
    sourceType: 'scientific',
    confidence: 'measured',
    reviewState: 'runtime',
    severity: classifyCo2(latest.valuePpm),
    climateIndicator: {
      indicator: 'atmospheric-co2',
      value: latest.valuePpm,
      unit: 'ppm',
      baseline: 'Mauna Loa monthly mean'
    }
  };
}

export function getFallbackClimateIndicatorSnapshot(options = {}) {
  const fetchedAt = options.fetchedAt || new Date().toISOString();
  return createOnlineSignalSnapshot({
    id: 'climate-indicators-watch',
    layerId: CLIMATE_LAYER_ID,
    sourceStatus: 'fallback',
    sourceUrl: COPERNICUS_INDICATORS_URL,
    sourceName: 'Climate indicator source registry',
    fetchedAt,
    signals: fallbackClimateSignals(fetchedAt)
  });
}

export async function fetchClimateIndicatorSnapshot(options = {}) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== 'function') return getFallbackClimateIndicatorSnapshot(options);

  const fetchedAt = new Date().toISOString();
  const signals = [];
  const errors = [];

  try {
    const gistempText = await fetchText(fetchImpl, NASA_GISTEMP_URL);
    const latestTemperature = parseGistempText(gistempText);
    if (latestTemperature) signals.push(temperatureSignal(latestTemperature, fetchedAt));
  } catch (error) {
    errors.push(`NASA GISTEMP: ${error.message || error}`);
  }

  try {
    const co2Text = await fetchText(fetchImpl, NOAA_CO2_URL);
    const latestCo2 = parseNoaaCo2Csv(co2Text);
    if (latestCo2) signals.push(co2Signal(latestCo2, fetchedAt));
  } catch (error) {
    errors.push(`NOAA CO2: ${error.message || error}`);
  }

  const sourceSignals = signals.length
    ? [...signals, climateStudyWatchSignal(fetchedAt)]
    : fallbackClimateSignals(fetchedAt);
  const snapshot = createOnlineSignalSnapshot({
    id: 'climate-indicators-watch',
    layerId: CLIMATE_LAYER_ID,
    sourceStatus: signals.length ? (errors.length ? 'partial-live' : 'live') : 'fallback',
    sourceUrl: COPERNICUS_INDICATORS_URL,
    sourceName: 'Climate indicator watch',
    fetchedAt,
    signals: sourceSignals
  });
  snapshot.errors = errors;
  return snapshot;
}
