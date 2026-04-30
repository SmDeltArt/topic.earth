export const METEO_CLOUD_LAYER_ID = 'meteo-clouds';
export const METEO_REALTIME_LAYER_ID = 'meteo-live';

const OPEN_METEO_FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const CURRENT_VARIABLES = 'temperature_2m,relative_humidity_2m,precipitation,cloud_cover,wind_speed_10m,wind_direction_10m,weather_code';

const SAMPLE_LOCATIONS = [
  { id: 'brussels', name: 'Brussels', country: 'Belgium', region: 'Europe', lat: 50.8503, lon: 4.3517 },
  { id: 'reykjavik', name: 'Reykjavik', country: 'Iceland', region: 'North Atlantic', lat: 64.1466, lon: -21.9426 },
  { id: 'new_york', name: 'New York', country: 'United States', region: 'North America', lat: 40.7128, lon: -74.0060 },
  { id: 'sao_paulo', name: 'Sao Paulo', country: 'Brazil', region: 'South America', lat: -23.5505, lon: -46.6333 },
  { id: 'lagos', name: 'Lagos', country: 'Nigeria', region: 'West Africa', lat: 6.5244, lon: 3.3792 },
  { id: 'delhi', name: 'Delhi', country: 'India', region: 'South Asia', lat: 28.6139, lon: 77.2090 },
  { id: 'tokyo', name: 'Tokyo', country: 'Japan', region: 'East Asia', lat: 35.6762, lon: 139.6503 },
  { id: 'sydney', name: 'Sydney', country: 'Australia', region: 'Oceania', lat: -33.8688, lon: 151.2093 }
];

const FALLBACK_CONDITIONS = [
  { cloud_cover: 70, temperature_2m: 8, relative_humidity_2m: 86, precipitation: 0.1, wind_speed_10m: 18, wind_direction_10m: 240, weather_code: 3 },
  { cloud_cover: 82, temperature_2m: 3, relative_humidity_2m: 79, precipitation: 0.0, wind_speed_10m: 24, wind_direction_10m: 290, weather_code: 3 },
  { cloud_cover: 55, temperature_2m: 15, relative_humidity_2m: 61, precipitation: 0.0, wind_speed_10m: 16, wind_direction_10m: 210, weather_code: 2 },
  { cloud_cover: 38, temperature_2m: 24, relative_humidity_2m: 72, precipitation: 0.0, wind_speed_10m: 11, wind_direction_10m: 130, weather_code: 1 },
  { cloud_cover: 67, temperature_2m: 29, relative_humidity_2m: 80, precipitation: 0.2, wind_speed_10m: 12, wind_direction_10m: 220, weather_code: 61 },
  { cloud_cover: 44, temperature_2m: 33, relative_humidity_2m: 41, precipitation: 0.0, wind_speed_10m: 9, wind_direction_10m: 280, weather_code: 2 },
  { cloud_cover: 35, temperature_2m: 19, relative_humidity_2m: 58, precipitation: 0.0, wind_speed_10m: 22, wind_direction_10m: 160, weather_code: 1 },
  { cloud_cover: 42, temperature_2m: 20, relative_humidity_2m: 68, precipitation: 0.0, wind_speed_10m: 17, wind_direction_10m: 80, weather_code: 2 }
];

function num(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function pct(value) {
  return `${Math.round(num(value))}%`;
}

function temp(value) {
  return `${Math.round(num(value))} deg C`;
}

function makePoint(location, current, live) {
  const time = current?.time || new Date().toISOString();
  const cloudCover = num(current?.cloud_cover);
  const temperature = num(current?.temperature_2m);
  const humidity = num(current?.relative_humidity_2m);
  const precipitation = num(current?.precipitation);
  const windSpeed = num(current?.wind_speed_10m);
  const windDirection = num(current?.wind_direction_10m);
  const source = live ? 'Open-Meteo realtime model' : 'Offline meteo sample';

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
    summary: `${source} for ${location.name}: ${temp(temperature)}, ${pct(cloudCover)} cloud cover, ${windSpeed.toFixed(0)} km/h wind, ${precipitation.toFixed(1)} mm precipitation.`,
    insight: `<p><strong>Temperature:</strong> ${temp(temperature)}</p><p><strong>Cloud cover:</strong> ${pct(cloudCover)}</p><p><strong>Humidity:</strong> ${pct(humidity)}</p><p><strong>Wind:</strong> ${windSpeed.toFixed(0)} km/h from ${windDirection.toFixed(0)} deg</p><p><strong>Precipitation:</strong> ${precipitation.toFixed(1)} mm</p><p><strong>Updated:</strong> ${time}</p>`,
    isRealtimeMeteo: true,
    isLive: live,
    meteo: { cloudCover, temperature, humidity, precipitation, windSpeed, windDirection, weatherCode: num(current?.weather_code), time }
  };
}

function cloudSample(point) {
  return {
    id: point.id,
    lat: point.lat,
    lon: point.lon,
    cloudCover: point.meteo?.cloudCover || 0,
    precipitation: point.meteo?.precipitation || 0,
    windSpeed: point.meteo?.windSpeed || 0,
    isLive: point.isLive !== false
  };
}

export function getFallbackMeteoSnapshot() {
  const points = SAMPLE_LOCATIONS.map((location, index) => makePoint(location, {
    ...FALLBACK_CONDITIONS[index % FALLBACK_CONDITIONS.length],
    time: new Date().toISOString()
  }, false));
  return { live: false, source: 'offline-sample', fetchedAt: new Date().toISOString(), points, cloudSamples: points.map(cloudSample) };
}

export async function fetchRealtimeMeteoSnapshot(options = {}) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== 'function') return getFallbackMeteoSnapshot();

  const params = new URLSearchParams({
    latitude: SAMPLE_LOCATIONS.map(location => location.lat).join(','),
    longitude: SAMPLE_LOCATIONS.map(location => location.lon).join(','),
    current: CURRENT_VARIABLES,
    timezone: 'UTC',
    forecast_days: '1'
  });

  try {
    const response = await fetchImpl(`${OPEN_METEO_FORECAST_URL}?${params.toString()}`);
    if (!response.ok) throw new Error(`Open-Meteo responded ${response.status}`);
    const payload = await response.json();
    const payloadList = Array.isArray(payload) ? payload : [payload];
    const points = SAMPLE_LOCATIONS.map((location, index) => makePoint(location, payloadList[index]?.current || {}, true));
    return { live: true, source: 'open-meteo', fetchedAt: new Date().toISOString(), points, cloudSamples: points.map(cloudSample) };
  } catch (error) {
    console.warn('[Meteo] Realtime fetch failed, using offline sample:', error);
    return getFallbackMeteoSnapshot();
  }
}