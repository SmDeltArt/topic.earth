const AUTH_ACTIONS = new Set(['signin', 'signin/github', 'signout', 'csrf', 'session', 'providers', 'callback/github', 'error']);
const READ_TOOLS = new Set(['topic_summary', 'translate_to_french']);
export async function requestAllowed(request) {
  let path;
  try { path = decodeURIComponent(new URL(request.url).pathname).replace(/\/$/, ''); }
  catch { return false; }
  // Reject ambiguous encodings rather than allow an origin router to interpret them differently.
  if (/[\\%]/.test(path) || path.includes('//') || /\/(?:\.|\.\.)(?:\/|$)/.test(path)) return false;
  if (path.startsWith('/server/') || path === '/server') return false;
  if (path.startsWith('/api/auth/')) {
    return AUTH_ACTIONS.has(path.slice('/api/auth/'.length)) && ['GET', 'POST'].includes(request.method);
  }
  // Copied provider functions are not topic.earth's authenticated API. Some accept paid GETs.
  if (path.startsWith('/api/api/')) return false;
  if (path === '/mcp' || path === '/api/mcp') {
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return true;
    if (request.method !== 'POST') return false;
    try {
      const body = await request.clone().json();
      if (!body || Array.isArray(body)) return false;
      if (body.method === 'tools/call') return READ_TOOLS.has(body.params?.name);
      return ['initialize', 'notifications/initialized', 'ping', 'tools/list', 'resources/list', 'prompts/list'].includes(body.method);
    } catch { return false; }
  }
  if (path.startsWith('/api/')) {
    return ['/api/identity', '/api/tropical-cyclones', '/api/nasa-gistemp', '/api/api-settings.html'].includes(path)
      && ['GET', 'HEAD'].includes(request.method);
  }
  // New write endpoints require an explicit entry here AND requirePermission in the handler.
  return ['GET', 'HEAD', 'OPTIONS'].includes(request.method);
}
