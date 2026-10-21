export class RegionalLocationManager {
  static normalize(value) {
    if (!value || typeof value !== 'object' || value.lat == null || value.lon == null || String(value.lat).trim() === '' || String(value.lon).trim() === '') return null;
    const lat = Number(value.lat), lon = Number(value.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
    return { lat, lon, label: String(value.label || `${lat.toFixed(4)}, ${lon.toFixed(4)}`).slice(0, 200),
      country: String(value.country || '').slice(0, 100), region: String(value.region || '').slice(0, 100),
      city: String(value.city || '').slice(0, 100), province: String(value.province || value.county || '').slice(0,100), countryCode: String(value.countryCode || value.country_code || '').slice(0,5), precision: ['continent','country','region','city','address'].includes(value.precision) ? value.precision : 'region', source: 'preferred-location' };
  }

  static distance(point, context) {
    const a = this.normalize(point), b = this.normalize(context);
    if (!a || !b) return Infinity;
    const rad = v => v * Math.PI / 180;
    const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lon - a.lon) / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(Math.min(1, h)), Math.sqrt(Math.max(0, 1 - h)));
  }

  static async resolve(query) {
    const text = String(query || '').trim();
    if (!text) throw new Error('Enter a city, municipality or coordinates.');
    const coordinates = text.match(/^(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)$/);
    if (coordinates) {
      const result = this.normalize({ lat: coordinates[1], lon: coordinates[2], label: text, precision: 'region' });
      if (!result) throw new Error('Coordinates are outside the valid latitude/longitude range.');
      return result;
    }
    const cached = this.searchCache?.get(text.toLowerCase());
    if (cached && Date.now() - cached.time < 300000) return cached.context;
    if (this.searchPending) throw new Error('A location search is already in progress.');
    const elapsed = Date.now() - (this.lastSearchAt || 0);
    this.searchPending = true;
    try {
      if (elapsed < 1000) await new Promise(resolve => setTimeout(resolve, 1000 - elapsed));
      this.lastSearchAt = Date.now();
      const url = new URL('https://nominatim.openstreetmap.org/search');
      url.searchParams.set('format', 'jsonv2'); url.searchParams.set('limit', '1'); url.searchParams.set('addressdetails', '1'); url.searchParams.set('q', text);
      const response = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error(`Location search: HTTP ${response.status}`);
      const [place] = await response.json();
      const address = place?.address || {};
      const result = this.normalize({ lat: place?.lat, lon: place?.lon, label: place?.display_name || text,
        country: address.country, countryCode: address.country_code, province: address.county || address.state_district || '', region: address.state || address.region, city: address.city || address.town || address.village, precision: address.road ? 'address' : (address.city || address.town || address.village) ? 'city' : (address.state || address.region) ? 'region' : 'country' });
      if (!result) throw new Error('No location found. Try a municipality or coordinates.');
      this.searchCache ||= new Map();
      this.searchCache.set(text.toLowerCase(), { time: Date.now(), context: result });
      return result;
    } finally { this.searchPending = false; }
  }

  static labels(language = 'en') {
    return String(language).startsWith('fr') ? {
      heading: 'Ma localisation (World et Régional)', placeholder: 'Commune, ville ou latitude, longitude', save: 'Vérifier et définir', clear: 'Revenir à la localisation automatique',
      use: 'Définir le résultat comme ma localisation', hint: 'Enregistrée sur cet appareil. La recherche de lieu est envoyée à OpenStreetMap. Explorer un sujet ne remplace pas ce choix.',
      radius: 'Distance maximale des sujets régionaux', all: 'Toutes les distances', checking: 'Recherche du lieu…', saved: 'Localisation définie : ', automatic: 'Localisation automatique sélectionnée.'
    } : {
      heading: 'My location (World and Regional)', placeholder: 'Municipality, city or latitude, longitude', save: 'Check and set', clear: 'Return to automatic location',
      use: 'Set the result as my location', hint: 'Saved on this device. Place searches are sent to OpenStreetMap. Exploring a topic does not replace this choice.',
      radius: 'Maximum distance for Regional topics', all: 'All distances', checking: 'Finding location…', saved: 'Location set: ', automatic: 'Automatic location selected.'
    };
  }
}
