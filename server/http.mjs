export function webRequest(req) {
  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers)) {
    if (value !== undefined) headers.set(name, Array.isArray(value) ? value.join(', ') : value);
  }
  const method = req.method || 'GET';
  const options = { method, headers };
  if (!['GET', 'HEAD'].includes(method)) {
    options.body = typeof req.body === 'string' || Buffer.isBuffer(req.body)
      ? req.body : new URLSearchParams(req.body || {}).toString();
  }
  return new Request(new URL(req.url, process.env.AUTH_URL || 'https://invalid.local'), options);
}
export async function send(res, response) {
  res.statusCode = response.status;
  response.headers.forEach((value, name) => { if (name !== 'set-cookie') res.setHeader(name, value); });
  const cookies = response.headers.getSetCookie();
  if (cookies.length) res.setHeader('Set-Cookie', cookies);
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(await response.text());
}
