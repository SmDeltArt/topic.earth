import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { requestAllowed } from '../server/request-policy.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = Number(process.env.PORT || 5501);
const types = { '.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css',
  '.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png',
  '.jpeg':'image/jpeg','.jpg':'image/jpeg','.webp':'image/webp','.gif':'image/gif','.glb':'model/gltf-binary',
  '.gltf':'model/gltf+json','.wasm':'application/wasm','.mp3':'audio/mpeg','.webm':'video/webm',
  '.mp4':'video/mp4','.woff':'font/woff','.woff2':'font/woff2' };
const handlers = {
  '/api/identity': '../api/identity.mjs',
  '/api/nasa-gistemp': '../api/nasa-gistemp.mjs',
  '/api/tropical-cyclones': '../api/tropical-cyclones.js',
  '/api/mcp': '../api/mcp.js', '/mcp': '../api/mcp.js'
};
createServer(async (req, res) => {
  res.status = code => { res.statusCode = code; return res; };
  res.json = body => { res.setHeader('Content-Type','application/json'); res.end(JSON.stringify(body)); return res; };
  res.send = body => { res.end(body); return res; };
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  try {
    const url = new URL(req.url, `http://localhost:${port}`);
    const path = decodeURIComponent(url.pathname);
    if (path.split('/').some(part => part.startsWith('.') && part !== '.well-known')
      || /^\/(?:node_modules|server|tests|tools)(?:\/|$)/.test(path)) return res.status(404).end();
    // These known copied frontend assets are static locally, never executed as functions.
    const localApiAsset = req.method === 'GET' && /^\/api\/(?:src|shared|brand)\//.test(path)
      && ['.js','.css','.svg','.png','.json','.webp','.jpeg'].includes(extname(path));
    const allowed = localApiAsset || await requestAllowed(new Request(url, { method: req.method, headers: req.headers,
      ...(req.method === 'POST' && ['/mcp','/api/mcp'].includes(path) ? { body: await collectBody(req) } : {}) }));
    if (!allowed) return res.status(403).json({error:'Operation not enabled'});
    const modulePath = path.startsWith('/api/auth/') ? '../api/auth/[...action].mjs' : handlers[path];
    if (modulePath) {
      if (!['GET','HEAD'].includes(req.method)) req.body ??= await collectBody(req);
      return await (await import(new URL(modulePath, import.meta.url))).default(req,res);
    }
    if (!['GET','HEAD'].includes(req.method)) return res.status(405).end();
    const file = resolve(root, '.' + (path === '/' ? '/index.html' : path));
    if (!file.startsWith(resolve(root) + sep) || !(await stat(file)).isFile()) return res.status(404).end();
    res.setHeader('Content-Type', types[extname(file)] || 'application/octet-stream');
    return res.end(req.method === 'HEAD' ? undefined : await readFile(file));
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return res.status(404).end();
    return res.status(error.status || 503).json({error:'Local request unavailable'});
  }
}).listen(port,'127.0.0.1',() => console.log(`topic.earth: http://localhost:${port} (local server with API routes)`));

async function collectBody(req) {
  const chunks = []; let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 1024*1024) throw Object.assign(new Error('Request too large'),{status:413});
    chunks.push(chunk);
  }
  const body = Buffer.concat(chunks).toString('utf8');
  req.body = body;
  return body;
}
