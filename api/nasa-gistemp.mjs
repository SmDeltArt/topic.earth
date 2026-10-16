// Same-origin read of one fixed public dataset. Never accepts a caller-supplied URL.
const DATA_URL = 'https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.txt';

export default async function handler(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const response = await fetch(DATA_URL, {
      headers: { Accept: 'text/plain', 'User-Agent': 'topic.earth climate indicators (+https://www.topic.earth)' },
      signal: AbortSignal.timeout(10000), redirect: 'error'
    });
    if (!response.ok) throw new Error('NASA data unavailable');
    const text = await response.text();
    if (text.length > 1024 * 1024 || !/^\d{4}\s+(?:-?\d+|\*{3,4})\s+/m.test(text)) {
      throw new Error('Unexpected NASA data');
    }
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).send(text);
  } catch {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(503).json({ error: 'NASA GISTEMP is temporarily unavailable' });
  }
}
