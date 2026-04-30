/**
 * Country metadata for atlas-style intelligence
 * Supports hover/focus information and future boundary overlays
 */
export const COUNTRY_METADATA = {
  'FR': {
    name: 'France',
    continent: 'Europe',
    capital: { lat: 48.8566, lon: 2.3522 },
    population: '67.4M',
    area: '643,801 km²',
    summary: 'Major European economy, EU founding member, permanent UN Security Council member.'
  },
  'DE': {
    name: 'Germany',
    continent: 'Europe',
    capital: { lat: 52.5200, lon: 13.4050 },
    population: '83.2M',
    area: '357,022 km²',
    summary: 'Largest European economy, industrial powerhouse, EU political and economic leader.'
  },
  'IT': {
    name: 'Italy',
    continent: 'Europe',
    capital: { lat: 41.9028, lon: 12.4964 },
    population: '59.1M',
    area: '301,340 km²',
    summary: 'G7 member, Mediterranean trading hub, rich cultural and historical heritage.'
  },
  'ES': {
    name: 'Spain',
    continent: 'Europe',
    capital: { lat: 40.4168, lon: -3.7038 },
    population: '47.4M',
    area: '505,990 km²',
    summary: 'Iberian Peninsula nation, renewable energy leader, major tourism economy.'
  },
  'GB': {
    name: 'United Kingdom',
    continent: 'Europe',
    capital: { lat: 51.5074, lon: -0.1278 },
    population: '67.3M',
    area: '242,495 km²',
    summary: 'Post-Brexit economy, global financial center, permanent UN Security Council member.'
  },
  'SE': {
    name: 'Sweden',
    continent: 'Europe',
    capital: { lat: 59.3293, lon: 18.0686 },
    population: '10.4M',
    area: '450,295 km²',
    summary: 'Nordic welfare state, innovation leader, high sustainability and living standards.'
  },
  'CH': {
    name: 'Switzerland',
    continent: 'Europe',
    capital: { lat: 47.3769, lon: 8.5417 },
    population: '8.7M',
    area: '41,285 km²',
    summary: 'Alpine nation, banking center, known for neutrality and high quality of life.'
  },
  'BE': {
    name: 'Belgium',
    continent: 'Europe',
    capital: { lat: 50.8503, lon: 4.3517 },
    population: '11.6M',
    area: '30,528 km²',
    summary: 'EU and NATO headquarters, multilingual crossroads of Western Europe.'
  },
  'JP': {
    name: 'Japan',
    continent: 'Asia',
    capital: { lat: 35.6762, lon: 139.6503 },
    population: '125.7M',
    area: '377,975 km²',
    summary: 'Advanced economy, technological innovator, major manufacturing and export power.'
  }
};

// Country code lookup by coordinate proximity
export function getCountryFromCoordinates(lat, lon) {
  const distances = Object.entries(COUNTRY_METADATA).map(([code, data]) => {
    const capLat = data.capital.lat;
    const capLon = data.capital.lon;
    const dist = Math.sqrt(Math.pow(lat - capLat, 2) + Math.pow(lon - capLon, 2));
    return { code, data, dist };
  });
  
  distances.sort((a, b) => a.dist - b.dist);
  
  // Return closest if within reasonable range (roughly 10 degrees)
  if (distances[0].dist < 10) {
    return { code: distances[0].code, ...distances[0].data };
  }
  
  return null;
}