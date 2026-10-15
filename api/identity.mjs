import { identity } from '../server/auth.mjs';
import { webRequest, send } from '../server/http.mjs';
export default async function handler(req, res) {
  if (req.method !== 'GET') return send(res, Response.json({ error: 'Method not allowed' }, { status: 405 }));
  try { return send(res, Response.json({ user: await identity(webRequest(req)) })); }
  catch { return send(res, Response.json({ error: 'Identity verification unavailable' }, { status: 503 })); }
}
