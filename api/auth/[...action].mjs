import { handleAuth } from '../../server/auth.mjs';
import { webRequest, send } from '../../server/http.mjs';
export default async function handler(req, res) {
  try { await send(res, await handleAuth(webRequest(req))); }
  catch { await send(res, Response.json({ error: 'Authentication unavailable' }, { status: 503 })); }
}
