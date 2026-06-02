export const METEO_CLOUD_LAYER_ID = 'meteo-clouds';
export const METEO_REALTIME_LAYER_ID = 'meteo-live';

const OPEN_METEO_FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const SOURCE_URL = 'https://open-meteo.com/en/docs';
const CURRENT_VARIABLES = [
  'temperature_2m',
  'relative_humidity_2m',
  'precipitation',
  'rain',
  'showers',
  'cloud_cover',
  'wind_speed_10m',
  'wind_gusts_10m',
  'wind_direction_10m',
  'weather_code'
].join(',');
const HOURLY_VARIABLES = [
  'temperature_2m',
  'precipitation',
  'rain',
  'showers',
  'precipitation_probability',
  'weather_code',
  'cloud_cover',
  'wind_speed_10m',
  'wind_gusts_10m',
  'cape',
  'freezing_level_height'
].join(',');

const SAMPLE_LOCATIONS = [
  { id: 'brussels', name: 'Brussels', country: 'Belgium', region: 'Europe', lat: 50.8503, lon: 4.3517, watch: true },
  { id: 'reykjavik', name: 'Reykjavik', country: 'Iceland', region: 'North Atlantic', lat: 64.1466, lon: -21.9426 },
  { id: 'new_york', name: 'New York', country: 'United States', region: 'North America', lat: 40.7128, lon: -74.0060, watch: true },
  { id: 'sao_paulo', name: 'Sao Paulo', country: 'Brazil', region: 'South America', lat: -23.5505, lon: -46.6333 },
  { id: 'lagos', name: 'Lagos', country: 'Nigeria', region: 'West Africa', lat: 6.5244, lon: 3.3792 },
  { id: 'delhi', name: 'Delhi', country: 'India', region: 'South Asia', lat: 28.6139, lon: 77.2090, watch: true },
  { id: 'tokyo', name: 'Tokyo', country: 'Japan', region: 'East Asia', lat: 35.6762, lon: 139.6503, watch: true },
  { id: 'sydney', name: 'Sydney', country: 'Australia', region: 'Oceania', lat: -33.8688, lon: 151.2093 }
];

const FALLBACK_CONDITIONS = [
  { cloud_cover: 70, temperature_2m: 8, relative_humidity_2m: 86, precipitation: 0.1, wind_speed_10m: 18, wind_gusts_10m: 26, wind_direction_10m: 240, weather_code: 3 },
  { cloud_cover: 82, temperature_2m: 3, relative_humidity_2m: 79, precipitation: 0.0, wind_speed_10m: 24, wind_gusts_10m: 34, wind_direction_10m: 290, weather_code: 3 },
  { cloud_cover: 55, temperature_2m: 15, relative_humidity_2m: 61, precipitation: 0.0, wind_speed_10m: 16, wind_gusts_10m: 22, wind_direction_10m: 210, weather_code: 2 },
  { cloud_cover: 38, temperature_2m: 24, relative_humidity_2m: 72, precipitation: 0.0, wind_speed_10m: 11, wind_gusts_10m: 18, wind_direction_10m: 130, weather_code: 1 },
  { cloud_cover: 67, temperature_2m: 29, relative_humidity_2m: 80, precipitation: 0.2, wind_speed_10m: 12, wind_gusts_10m: 24, wind_direction_10m: 220, weather_code: 61 },
  { cloud_cover: 44, temperature_2m: 33, relative_humidity_2m: 41, precipitation: 0.0, wind_speed_10m: 9, wind_gusts_10m: 16, wind_direction_10m: 280, weather_code: 2 },
  { cloud_cover: 35, temperature_2m: 19, relative_humidity_2m: 58, precipitation: 0.0, wind_speed_10m: 22, wind_gusts_10m: 31, wind_direction_10m: 160, weather_code: 1 },
  { cloud_cover: 42, temperature_2m: 20, relative_humidity_2m: 68, precipitation: 0.0, wind_speed_10m: 17, wind_gusts_10m: 23, wind_direction_10m: 80, weather_code: 2 }
];

function num(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function avg(values = []) {
  const numeric = values.map(value => Number(value)).filter(Number.isFinite);
  if (!numeric.length) return 0;
  return numeric.reduce((sum, value) => sum + value, 0) / numeric.length;
}

function max(values = []) {
  const numeric = values.map(value => Number(value)).filter(Number.isFinite);
  return numeric.length ? Math.max(...numeric) : 0;
}

function sum(values = []) {
  return values.map(value => Number(value)).filter(Number.isFinite).reduce((total, value) => total + value, 0);
}

function pct(value) {
  return `${Math.round(num(value))}%`;
}

function temp(value) {
  return `${Math.round(num(value))} deg C`;
}

function slug(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'point';
}

function weatherCodeLabel(code = 0) {
  const value = Number(code);
  if ([95, 96, 99].includes(value)) return 'thunderstorm';
  if ([80, 81, 82].includes(value)) return 'rain showers';
  if ([61, 63, 65, 66, 67].includes(value)) return 'rain';
  if ([71, 73, 75, 77, 85, 86].includes(value)) return 'snow or freezing precipitation';
  if ([45, 48].includes(value)) return 'fog';
  if (value >= 1 && value <= 3) return 'cloud cover';
  return 'weather signal';
}

function normalizeLocation(location = {}, index = 0) {
  const lat = Number(location.lat ?? location.latitude);
  const lon = Number(location.lon ?? location.longitude ?? location.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  const name = String(location.name || location.label || location.city || location.region || location.country || `Meteo point ${index + 1}`).trim();
  return {
    id: slug(location.id || name || `location-${index}`),
    name,
    country: String(location.country || '').trim() || 'Unknown',
    region: String(location.region || location.continent || '').trim() || 'Regional watch',
    lat,
    lon,
    source: location.source || '',
    watch: location.watch !== false,
    isRegionalFocus: Boolean(location.isRegionalFocus)
  };
}

export function buildMeteoWatchLocations(options = {}) {
  const locations = [...SAMPLE_LOCATIONS];
  const focus = normalizeLocation({
    ...(options.regionalContext || options.userContext || {}),
    id: 'regional-focus',
    name: options.regionalContext?.label || options.userContext?.label || 'Your regional meteo watch',
    watch: true,
    isRegionalFocus: true
  });

  if (focus) {
    locations.unshift(focus);
  }

  const customLocations = Array.isArray(options.locations) ? options.locations : [];
  customLocations.forEach((location, index) => {
    const normalized = normalizeLocation(location, index + locations.length);
    if (normalized && !locations.some(existing => Math.abs(existing.lat - normalized.lat) < 0.01 && Math.abs(existing.lon - normalized.lon) < 0.01)) {
      locations.push(normalized);
    }
  });

  return locations
    .map(normalizeLocation)
    .filter(Boolean)
    .slice(0, 24);
}

function getHourlySeries(hourly = {}, key = '') {
  return Array.isArray(hourly?.[key]) ? hourly[key] : [];
}

function summarizeHourly(hourly = {}) {
  const temperatures = getHourlySeries(hourly, 'temperature_2m');
  const precipitation = getHourlySeries(hourly, 'precipitation');
  const rain = getHourlySeries(hourly, 'rain');
  const showers = getHourlySeries(hourly, 'showers');
  const gusts = getHourlySeries(hourly, 'wind_gusts_10m');
  const wind = getHourlySeries(hourly, 'wind_speed_10m');
  const cape = getHourlySeries(hourly, 'cape');
  const probability = getHourlySeries(hourly, 'precipitation_probability');
  const freezing = getHourlySeries(hourly, 'freezing_level_height');
  const codes = getHourlySeries(hourly, 'weather_code').map(value => Number(value)).filter(Number.isFinite);

  return {
    precipitationTotalMm: sum(precipitation),
    precipitationMaxMmH: max(precipitation),
    rainMaxMmH: max(rain),
    showersMaxMmH: max(showers),
    windGustMaxKmh: max(gusts),
    windSpeedMaxKmh: max(wind),
    capeMax: max(cape),
    precipitationProbabilityMax: max(probability),
    temperatureMaxC: max(temperatures),
    temperatureMinC: temperatures.length ? Math.min(...temperatures.map(Number).filter(Number.isFinite)) : 0,
    temperatureAvgC: avg(temperatures),
    freezingLevelMinM: freezing.length ? Math.min(...freezing.map(Number).filter(Number.isFinite)) : 0,
    weatherCodes: [...new Set(codes)].sort((a, b) => a - b)
  };
}

function classifySeverity(score = 0) {
  if (score >= 90) return 'severe';
  if (score >= 65) return 'warning';
  if (score >= 40) return 'notable';
  return 'watch';
}

function severityRank(severity = '') {
  return { severe: 4, warning: 3, notable: 2, watch: 1 }[String(severity || '').toLowerCase()] || 0;
}

function severityColor(severity = '') {
  const colors = {
    severe: '#ff2d55',
    warning: '#ff8f00',
    notable: '#ffd166',
    watch: '#4fc3f7'
  };
  return colors[String(severity || '').toLowerCase()] || colors.watch;
}

function withWorldMeteoRuntime(point = {}, snapshotMeta = {}) {
  const isEvent = Boolean(point.isAutoMeteoEvent);
  const rank = severityRank(point.severity);
  const visibleInWorldMeteo = isEvent
    ? rank >= 2 || Boolean(point.isRegionalFocus)
    : Boolean(point.isRegionalFocus);
  const updatedAt = point.meteo?.time || snapshotMeta.fetchedAt || new Date().toISOString();

  return {
    ...point,
    date: String(updatedAt).slice(0, 10),
    updatedAt,
    validFrom: point.validFrom || updatedAt,
    validTo: point.validTo || point.storageMeta?.expiresAt || '',
    visibleInWorldMeteo,
    worldMeteoRuntime: true,
    markerColor: isEvent ? severityColor(point.severity) : (point.isRegionalFocus ? '#7dd3fc' : '#4fc3f7'),
    markerPriority: isEvent ? (100 + rank * 10 + (Number(point.severityScore) || 0)) : (point.isRegionalFocus ? 40 : 10),
    confidence: point.confidence || (isEvent ? 'model-signal' : 'live-model')
  };
}

function buildWorldMeteoWatch({ live = false, source = 'offline-sample', sourceUrl = SOURCE_URL, fetchedAt = new Date().toISOString(), locations = [], livePoints = [], eventPoints = [] } = {}) {
  const runtimeLivePoints = livePoints.map(point => withWorldMeteoRuntime(point, { fetchedAt }));
  const runtimeEventPoints = eventPoints.map(point => withWorldMeteoRuntime(point, { fetchedAt }));
  const points = [...runtimeLivePoints, ...runtimeEventPoints].sort((a, b) => {
    const priorityDelta = (Number(b.markerPriority) || 0) - (Number(a.markerPriority) || 0);
    if (priorityDelta !== 0) return priorityDelta;
    return new Date(b.updatedAt || b.date || 0) - new Date(a.updatedAt || a.date || 0);
  });

  return {
    id: 'world-meteo-watch',
    live,
    source,
    sourceUrl,
    fetchedAt,
    updatedAt: fetchedAt,
    locations,
    points,
    livePoints: runtimeLivePoints,
    eventPoints: runtimeEventPoints,
    worldPoints: points.filter(point => point.visibleInWorldMeteo),
    sourceStatus: live ? 'live' : 'fallback'
  };
}

function makeEvent(location, current = {}, hourly = {}, live = true) {
  if (!location.watch) return null;

  const stats = summarizeHourly(hourly);
  const currentTemp = num(current.temperature_2m);
  const currentCode = num(current.weather_code);
  const allCodes = [...new Set([currentCode, ...stats.weatherCodes].filter(Number.isFinite))];
  const hasThunderCode = allCodes.some(code => [95, 96, 99].includes(Number(code)));
  const hasHeavyRainCode = allCodes.some(code => [65, 80, 81, 82].includes(Number(code)));
  const hasFreezeCode = allCodes.some(code => [66, 67, 71, 73, 75, 77, 85, 86].includes(Number(code)));
  const anomalyCurrentC = currentTemp - stats.temperatureAvgC;

  const candidates = [
    {
      eventType: 'storm',
      label: 'storm / orage',
      score: (hasThunderCode ? 45 : 0)
        + Math.min(25, stats.capeMax / 80)
        + Math.min(25, stats.showersMaxMmH * 6)
        + Math.min(20, stats.windGustMaxKmh / 3),
      reason: `thunder code ${hasThunderCode ? 'present' : 'not present'}, CAPE max ${Math.round(stats.capeMax)}, showers max ${stats.showersMaxMmH.toFixed(1)} mm/h, gusts ${stats.windGustMaxKmh.toFixed(0)} km/h`
    },
    {
      eventType: 'heavy-rain',
      label: 'heavy rain / flood watch',
      score: (hasHeavyRainCode ? 35 : 0)
        + Math.min(45, stats.precipitationMaxMmH * 8)
        + Math.min(25, stats.precipitationTotalMm / 2)
        + Math.min(15, stats.precipitationProbabilityMax / 7),
      reason: `precipitation max ${stats.precipitationMaxMmH.toFixed(1)} mm/h, total ${stats.precipitationTotalMm.toFixed(1)} mm, probability ${stats.precipitationProbabilityMax.toFixed(0)}%`
    },
    {
      eventType: 'heat-anomaly',
      label: 'temperature anomaly / heat watch',
      score: Math.max(0, Math.min(55, (currentTemp - 30) * 7))
        + Math.max(0, Math.min(35, anomalyCurrentC * 7))
        + Math.max(0, Math.min(20, (stats.temperatureMaxC - 32) * 4)),
      reason: `current ${currentTemp.toFixed(1)} deg C, short-window anomaly ${anomalyCurrentC.toFixed(1)} deg C, max ${stats.temperatureMaxC.toFixed(1)} deg C`
    },
    {
      eventType: 'freeze-thaw',
      label: 'freeze / unfreezing watch',
      score: (hasFreezeCode ? 30 : 0)
        + (stats.temperatureMinC <= 1 && stats.temperatureMaxC >= 3 ? 45 : 0)
        + (currentTemp > -1 && currentTemp < 3 ? 20 : 0),
      reason: `min ${stats.temperatureMinC.toFixed(1)} deg C, max ${stats.temperatureMaxC.toFixed(1)} deg C, freezing level min ${stats.freezingLevelMinM.toFixed(0)} m`
    },
    {
      eventType: 'wind',
      label: 'wind warning',
      score: Math.max(0, Math.min(100, (stats.windGustMaxKmh - 35) * 2.2)),
      reason: `gusts max ${stats.windGustMaxKmh.toFixed(0)} km/h, wind max ${stats.windSpeedMaxKmh.toFixed(0)} km/h`
    }
  ];

  const best = candidates.sort((a, b) => b.score - a.score)[0];
  if (!best || best.score < 32) return null;

  const severity = classifySeverity(best.score);
  const date = String(current.time || new Date().toISOString()).slice(0, 10);
  const title = `${severity === 'severe' ? 'Severe' : severity === 'warning' ? 'Warning' : 'Possible'} ${best.label} near ${location.name}`;
  const summary = `${live ? 'Open-Meteo model data' : 'Offline sample data'} indicates ${best.label} near ${location.name}. ${best.reason}. This is model guidance, not an official emergency alert.`;

  return {
    id: `meteo_auto_${best.eventType}_${date}_${location.id}`,
    lat: location.lat,
    lon: location.lon,
    category: METEO_REALTIME_LAYER_ID,
    title,
    country: location.country,
    region: location.region,
    date,
    source: 'Open-Meteo forecast model',
    sourceUrl: SOURCE_URL,
    summary,
    insight: `<p><strong>Event:</strong> ${best.label}</p><p><strong>Severity:</strong> ${severity}</p><p><strong>Confidence:</strong> model-signal</p><p><strong>Reason:</strong> ${best.reason}</p><p><strong>Temperature:</strong> ${currentTemp.toFixed(1)} deg C</p><p><strong>Short-window anomaly:</strong> ${anomalyCurrentC.toFixed(1)} deg C vs fetched hourly window</p><p><strong>Precipitation max:</strong> ${stats.precipitationMaxMmH.toFixed(1)} mm/h</p><p><strong>Gust max:</strong> ${stats.windGustMaxKmh.toFixed(0)} km/h</p><p><strong>CAPE max:</strong> ${Math.round(stats.capeMax)}</p><p><strong>Updated:</strong> ${current.time || new Date().toISOString()}</p><p><em>Model guidance only. Check official local warnings for safety decisions.</em></p>`,
    isRealtimeMeteo: true,
    isLive: live,
    isAutoMeteoEvent: true,
    isRegionalFocus: Boolean(location.isRegionalFocus),
    eventType: best.eventType,
    severity,
    severityScore: Math.round(best.score),
    confidence: 'model-signal',
    regionalScope: location.isRegionalFocus ? 'region' : 'city',
    meteo: {
      ...stats,
      cloudCover: num(current.cloud_cover),
      temperature: currentTemp,
      humidity: num(current.relative_humidity_2m),
      precipitation: num(current.precipitation),
      windSpeed: num(current.wind_speed_10m),
      windGust: num(current.wind_gusts_10m),
      windDirection: num(current.wind_direction_10m),
      weatherCode: currentCode,
      weatherLabel: weatherCodeLabel(currentCode),
      time: current.time || new Date().toISOString(),
      sourceUrl: SOURCE_URL
    },
    storageMeta: {
      workflow: 'auto-meteo',
      autoUpdated: true,
      confidence: 'model-signal',
      expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString()
    }
  };
}

function makePoint(location, current, live, hourly = {}) {
  const time = current?.time || new Date().toISOString();
  const cloudCover = num(current?.cloud_cover);
  const temperature = num(current?.temperature_2m);
  const humidity = num(current?.relative_humidity_2m);
  const precipitation = num(current?.precipitation);
  const windSpeed = num(current?.wind_speed_10m);
  const windGust = num(current?.wind_gusts_10m);
  const windDirection = num(current?.wind_direction_10m);
  const source = live ? 'Open-Meteo realtime model' : 'Offline meteo sample';
  const stats = summarizeHourly(hourly);
  const anomalyCurrentC = temperature - stats.temperatureAvgC;

  return {
    id: `meteo_live_${location.id}`,
    lat: location.lat,
    lon: location.lon,
    category: METEO_REALTIME_LAYER_ID,
    title: `${location.name}: ${temp(temperature)}, ${pct(cloudCover)} clouds`,
    country: location.country,
    region: location.region,
    date: time.slice(0, 10),
    source,
    sourceUrl: SOURCE_URL,
    summary: `${source} for ${location.name}: ${temp(temperature)}, ${pct(cloudCover)} cloud cover, ${windSpeed.toFixed(0)} km/h wind, gusts ${windGust.toFixed(0)} km/h, ${precipitation.toFixed(1)} mm precipitation.`,
    insight: `<p><strong>Temperature:</strong> ${temp(temperature)}</p><p><strong>Short-window anomaly:</strong> ${anomalyCurrentC.toFixed(1)} deg C vs fetched hourly window</p><p><strong>Cloud cover:</strong> ${pct(cloudCover)}</p><p><strong>Humidity:</strong> ${pct(humidity)}</p><p><strong>Wind:</strong> ${windSpeed.toFixed(0)} km/h, gusts ${windGust.toFixed(0)} km/h from ${windDirection.toFixed(0)} deg</p><p><strong>Precipitation:</strong> ${precipitation.toFixed(1)} mm</p><p><strong>Weather:</strong> ${weatherCodeLabel(current?.weather_code)}</p><p><strong>Updated:</strong> ${time}</p>`,
    isRealtimeMeteo: true,
    isLive: live,
    isRegionalFocus: Boolean(location.isRegionalFocus),
    regionalScope: location.isRegionalFocus ? 'region' : 'city',
    meteo: { ...stats, cloudCover, temperature, humidity, precipitation, windSpeed, windGust, windDirection, weatherCode: num(current?.weather_code), weatherLabel: weatherCodeLabel(current?.weather_code), time }
  };
}

function sameMeteoLocation(a = {}, b = {}) {
  return Math.abs(Number(a.lat) - Number(b.lat)) < 0.02
    && Math.abs(Number(a.lon) - Number(b.lon)) < 0.02;
}

function getLinkedMeteoEvent(point = {}, eventPoints = []) {
  return eventPoints
    .filter(event => sameMeteoLocation(point, event))
    .sort((a, b) => severityRank(b.severity) - severityRank(a.severity))[0] || null;
}

function cloudSample(point, eventPoints = []) {
  const linkedEvent = getLinkedMeteoEvent(point, eventPoints);
  const severity = linkedEvent?.severity || point.severity || '';
  return {
    id: point.id,
    lat: point.lat,
    lon: point.lon,
    cloudCover: point.meteo?.cloudCover || 0,
    precipitation: point.meteo?.precipitation || 0,
    windSpeed: point.meteo?.windSpeed || 0,
    severity,
    severityScore: linkedEvent?.severityScore ?? point.severityScore ?? 0,
    eventType: linkedEvent?.eventType || point.eventType || '',
    markerColor: severity ? severityColor(severity) : '',
    isWarning: Boolean(linkedEvent || point.isAutoMeteoEvent),
    isLive: point.isLive !== false
  };
}

export function getFallbackMeteoSnapshot(options = {}) {
  const locations = buildMeteoWatchLocations(options);
  const points = locations.map((location, index) => makePoint(location, {
    ...FALLBACK_CONDITIONS[index % FALLBACK_CONDITIONS.length],
    time: new Date().toISOString()
  }, false));
  const events = locations
    .map((location, index) => makeEvent(location, {
      ...FALLBACK_CONDITIONS[index % FALLBACK_CONDITIONS.length],
      time: new Date().toISOString()
    }, {}, false))
    .filter(Boolean);
  const fetchedAt = new Date().toISOString();
  const worldMeteoWatch = buildWorldMeteoWatch({
    live: false,
    source: 'offline-sample',
    sourceUrl: SOURCE_URL,
    fetchedAt,
    locations,
    livePoints: points,
    eventPoints: events
  });
  return {
    live: false,
    source: 'offline-sample',
    sourceUrl: SOURCE_URL,
    fetchedAt,
    locations,
    points: worldMeteoWatch.points,
    livePoints: worldMeteoWatch.livePoints,
    eventPoints: worldMeteoWatch.eventPoints,
    worldPoints: worldMeteoWatch.worldPoints,
    cloudSamples: points.map(point => cloudSample(point, events)),
    worldMeteoWatch
  };
}

export async function fetchRealtimeMeteoSnapshot(options = {}) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== 'function') return getFallbackMeteoSnapshot(options);

  const locations = buildMeteoWatchLocations(options);
  const params = new URLSearchParams({
    latitude: locations.map(location => location.lat).join(','),
    longitude: locations.map(location => location.lon).join(','),
    current: CURRENT_VARIABLES,
    hourly: HOURLY_VARIABLES,
    timezone: 'auto',
    past_hours: String(options.pastHours || 12),
    forecast_hours: String(options.forecastHours || 36),
    forecast_days: '2'
  });

  try {
    const response = await fetchImpl(`${OPEN_METEO_FORECAST_URL}?${params.toString()}`);
    if (!response.ok) throw new Error(`Open-Meteo responded ${response.status}`);
    const payload = await response.json();
    const payloadList = Array.isArray(payload) ? payload : [payload];
    const fetchedAt = new Date().toISOString();
    const livePoints = locations.map((location, index) => makePoint(location, payloadList[index]?.current || {}, true, payloadList[index]?.hourly || {}));
    const eventPoints = locations
      .map((location, index) => makeEvent(location, payloadList[index]?.current || {}, payloadList[index]?.hourly || {}, true))
      .filter(Boolean);
    const worldMeteoWatch = buildWorldMeteoWatch({
      live: true,
      source: 'open-meteo',
      sourceUrl: SOURCE_URL,
      fetchedAt,
      locations,
      livePoints,
      eventPoints
    });
    return {
      live: true,
      source: 'open-meteo',
      sourceUrl: SOURCE_URL,
      fetchedAt,
      locations,
      points: worldMeteoWatch.points,
      livePoints: worldMeteoWatch.livePoints,
      eventPoints: worldMeteoWatch.eventPoints,
      worldPoints: worldMeteoWatch.worldPoints,
      cloudSamples: livePoints.map(point => cloudSample(point, eventPoints)),
      worldMeteoWatch
    };
  } catch (error) {
    console.warn('[Meteo] Realtime fetch failed, using offline sample:', error);
    return getFallbackMeteoSnapshot(options);
  }
}
