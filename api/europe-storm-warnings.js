import { fetchEuropeanWindWarnings } from '../lib/europe-storm-warnings.mjs';
export default async function handler(req,res) {
  if(req.method!=='GET') {res.setHeader('Allow','GET');return res.status(405).json({error:'Method not allowed'});}
  try {
    const result=await fetchEuropeanWindWarnings();
    const ok=result.successful>0;
    res.setHeader('Cache-Control',ok?'public, s-maxage=900, stale-while-revalidate=1800':'no-store');
    return res.status(ok?200:503).json(result);
  } catch {
    res.setHeader('Cache-Control','no-store');
    return res.status(503).json({error:'European warning feeds unavailable'});
  }
}
