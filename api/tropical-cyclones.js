import { fetchCycloneSnapshot } from '../lib/cyclone-sources.mjs';

// Public meteorological data only. No AI keys or private proxy configuration.
export default async function handler(req,res) {
  if (req.method !== 'GET') {res.setHeader('Allow','GET');res.status(405).json({error:'Method not allowed'});return;}
  try {
    const snapshot = await fetchCycloneSnapshot();
    const available=snapshot.storms.length > 0 || Object.values(snapshot.sources).some(source=>source.ok);
    res.setHeader('Cache-Control',available ? 'public, s-maxage=600, stale-while-revalidate=1800' : 'no-store');
    res.status(available ? 200 : 503).json(snapshot);
  } catch {res.setHeader('Cache-Control','no-store');res.status(503).json({error:'Cyclone sources temporarily unavailable'});}
}
