import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { encode } from '@auth/core/jwt';
import { authConfig, configuration, cookieName, identity, resolveIdentity, can, requirePermission, handleAuth, SESSION_SECONDS } from '../server/auth.mjs';
import { requestAllowed } from '../server/request-policy.mjs';
import middleware from '../middleware.mjs';
import authHandler from '../api/auth/[...action].mjs';
import githubSignInHandler from '../api/auth/signin/github.mjs';
import githubCallbackHandler from '../api/auth/callback/github.mjs';
import identityHandler from '../api/identity.mjs';

const env = { AUTH_URL: 'https://topic.earth', AUTH_GITHUB_ID: 'test-client',
  AUTH_GITHUB_SECRET: 'test-only-client-secret', AUTH_SECRET: 'test-only-secret-'.repeat(4), GITHUB_SUPER_ADMIN_IDS: '42' };
const now = Math.floor(Date.now() / 1000);
const token = { githubId: '42', githubToken: 'test-only-token', signedInAt: now };
const fetchUser = async () => Response.json({ id: 42, login: 'test-owner' });
const request = (path = '/api/future-json', method = 'POST', extra = {}) => new Request(`${env.AUTH_URL}${path}`, {
  method, headers: { origin: env.AUTH_URL, ...extra }
});
async function sessionCookie(claims = token, maxAge = SESSION_SECONDS) {
  const name = cookieName(configuration(env));
  return `${name}=${await encode({ token: claims, secret: env.AUTH_SECRET, salt: name, maxAge })}`;
}
function cookies(response) { return response.headers.getSetCookie().map(cookie => cookie.split(';')[0]).join('; '); }
async function csrf() {
  const response = await handleAuth(request('/api/auth/csrf', 'GET'), env);
  assert.equal(response.status, 200);
  return { csrfToken: (await response.json()).csrfToken, cookie: cookies(response) };
}
function formRequest(path, data, cookie) {
  return new Request(`${env.AUTH_URL}/api/auth/${path}`, { method: 'POST',
    headers: { origin: env.AUTH_URL, cookie, 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(data) });
}

test('configuration fails closed and production cookies require HTTPS', () => {
  assert.throws(() => configuration({}));
  assert.throws(() => configuration({ ...env, AUTH_URL: 'http://topic.earth' }));
  assert.throws(() => configuration({ ...env, AUTH_URL: 'http://localhost:3000', VERCEL: '1' }));
  assert.equal(configuration({ ...env, AUTH_URL: 'http://localhost:3000' }).secure, false);
  assert.equal(configuration({ ...env, AUTH_URL: 'http://localhost:3000', VERCEL: '1', VERCEL_ENV: 'development' }).secure, false);
  assert.throws(() => configuration({ ...env, AUTH_URL: 'http://localhost:3000', VERCEL_ENV: 'production' }));
  const options = authConfig(env).cookies.sessionToken.options;
  assert.deepEqual(options, { httpOnly: true, secure: true, sameSite: 'lax', path: '/' });
});
test('Vercel function adapters return no-store responses and preserve separate OAuth cookies', async () => {
  assert.equal(githubSignInHandler, authHandler);
  assert.equal(githubCallbackHandler, authHandler);
  const previous = Object.fromEntries(Object.keys(env).map(key => [key, process.env[key]]));
  const res = () => ({ headers: {}, setHeader(name, value) { this.headers[name.toLowerCase()] = value; }, end(body) { this.body = body; } });
  try {
    Object.assign(process.env, env);
    const csrfResponse = res();
    await authHandler({ url: '/api/auth/csrf', method: 'GET', headers: { host: 'evil.example', 'x-forwarded-host': 'evil.example' } }, csrfResponse);
    assert.equal(csrfResponse.statusCode, 200);
    assert.equal(csrfResponse.headers['cache-control'], 'no-store');
    assert.ok(Array.isArray(csrfResponse.headers['set-cookie']));
    const signedOut = res();
    await identityHandler({ url: '/api/identity?id=42&role=super-admin', method: 'GET', headers: {} }, signedOut);
    assert.equal(signedOut.statusCode, 200);
    assert.deepEqual(JSON.parse(signedOut.body), { user: null });
    delete process.env.AUTH_SECRET;
    const unavailable = res();
    await authHandler({ url: '/api/auth/csrf', method: 'GET', headers: {} }, unavailable);
    assert.equal(unavailable.statusCode, 503);
    assert.ok(!unavailable.body.includes(env.AUTH_GITHUB_SECRET));
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});
test('ordinary users cannot gain owner access through IDs or role claims', async () => {
  const user = await resolveIdentity({ ...token, role: 'super-admin' }, { ...env, GITHUB_SUPER_ADMIN_IDS: '99' }, fetchUser);
  assert.equal(user.role, 'user');
  assert.equal(can(user, 'content:write'), false);
  assert.equal(await resolveIdentity({ ...token, githubId: '99' }, env, fetchUser), null);
  const malformed = await resolveIdentity(token, { ...env, GITHUB_SUPER_ADMIN_IDS: '42,owner-login' }, fetchUser);
  assert.equal(malformed.role, 'user');
});
test('owner IDs are exact and privileges are separate from editor access', async () => {
  const owner = await resolveIdentity(token, env, fetchUser);
  assert.equal(owner.role, 'super-admin');
  assert.equal(can(owner, 'owner:manage'), true);
  assert.equal(can(owner, 'content:write'), true);
  assert.equal(can(owner, 'unknown:permission'), false);
  assert.equal(can({ role: 'editor' }, 'owner:manage'), false);
});
test('active team membership only; network errors, pending membership and org misconfiguration deny editors', async () => {
  const editorEnv = { ...env, GITHUB_SUPER_ADMIN_IDS: '', GITHUB_EDITOR_ORG: 'example', GITHUB_EDITOR_TEAM: 'editors' };
  const paths = [];
  const active = async url => { paths.push(url); return url.endsWith('/user') ? fetchUser() : Response.json({ state: 'active' }); };
  assert.equal((await resolveIdentity(token, editorEnv, active)).role, 'editor');
  assert.equal(paths[1], 'https://api.github.com/orgs/example/teams/editors/memberships/test-owner');
  for (const result of [Response.json({ state: 'pending' }), new Response('', { status: 403 }), new Response('', { status: 500 })]) {
    const fetcher = async url => url.endsWith('/user') ? fetchUser() : result;
    assert.equal((await resolveIdentity(token, editorEnv, fetcher)).role, 'user');
  }
  const offline = async url => { if (url.endsWith('/user')) return fetchUser(); throw new Error('offline'); };
  assert.equal((await resolveIdentity(token, editorEnv, offline)).role, 'user');
  assert.equal((await resolveIdentity(token, { ...editorEnv, GITHUB_EDITOR_ORG: '' }, active)).role, 'user');
  const orgEnv = { ...editorEnv, GITHUB_EDITOR_TEAM: '' };
  assert.equal((await resolveIdentity(token, orgEnv, active)).role, 'editor');
});
test('real encrypted cookies enforce permissions, expiry, tampering, and cookie-only identity', async () => {
  const cookie = await sessionCookie();
  assert.equal((await requirePermission(request(undefined, 'POST', { cookie }), 'owner:manage', env, fetchUser)).id, '42');
  await assert.rejects(requirePermission(request(undefined, 'POST', { cookie }), 'content:write', { ...env, GITHUB_SUPER_ADMIN_IDS: '' }, fetchUser), { status: 403 });
  await assert.rejects(requirePermission(request(), 'content:write', env, fetchUser), { status: 401 });
  assert.equal(await identity(request(undefined, 'POST', { cookie: cookie + 'tampered' }), env, fetchUser), null);
  assert.equal(await identity(request(undefined, 'POST', { authorization: `Bearer ${cookie.split('=')[1]}` }), env, fetchUser), null);
  const expired = await sessionCookie(token, -60);
  assert.equal(await identity(request(undefined, 'POST', { cookie: expired }), env, fetchUser), null);
  assert.equal(await resolveIdentity({ ...token, signedInAt: now - SESSION_SECONDS }, env, fetchUser, now), null);
  assert.equal(await identity(request(undefined, 'POST', { cookie: await sessionCookie({ ...token, signedInAt: now - SESSION_SECONDS }) }), env, fetchUser), null);
  await assert.rejects(requirePermission(request(undefined, 'POST', { cookie, origin: 'https://evil.example' }), 'content:write', env, fetchUser), { status: 403 });
  await assert.rejects(requirePermission(request(undefined, 'GET', { cookie }), 'content:write', env, fetchUser), { status: 405 });
  await assert.rejects(identity(request(undefined, 'POST', { cookie }), env, async () => new Response('', { status: 401 })));
});
test('default-deny policy blocks new writes, copied paid APIs, server source and unknown MCP tools', async () => {
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    assert.equal((await middleware(request('/api/future-json', method))).status, 403);
    assert.equal(await requestAllowed(request('/new-ai-action', method)), false);
  }
  for (const path of ['/api/future-json', '/api/api/openai-chat', '/api/api/openai-tts', '/server/auth.mjs', '/api%2fapi/openai-chat', '/%73erver/auth.mjs', '/api%252fapi/openai-chat']) {
    assert.equal(await requestAllowed(request(path, 'GET')), false);
  }
  for (const name of ['topic_summary', 'translate_to_french', 'content_update']) {
    const req = new Request(`${env.AUTH_URL}/mcp`, { method: 'POST', body: JSON.stringify({ method: 'tools/call', params: { name } }) });
    assert.equal(await requestAllowed(req), name !== 'content_update');
  }
  assert.equal(await requestAllowed(request('/api/identity', 'GET')), true);
  assert.equal(await requestAllowed(request('/api/nasa-gistemp', 'GET')), true);
  assert.equal(await requestAllowed(request('/api/nasa-gistemp', 'POST')), false);
});
test('sign-in requests only identity scope or optional read:org, and state/PKCE cookies are secure', async () => {
  const values = await csrf();
  const response = await handleAuth(formRequest('signin/github', { csrfToken: values.csrfToken }, values.cookie), env);
  const location = new URL(response.headers.get('location'));
  assert.equal(location.origin, 'https://github.com');
  assert.equal(location.searchParams.get('redirect_uri'), 'https://topic.earth/api/auth/callback/github');
  assert.equal(location.searchParams.get('scope'), '');
  assert.ok(location.searchParams.get('state'));
  assert.equal(location.searchParams.get('code_challenge_method'), 'S256');
  const setCookies = response.headers.getSetCookie();
  for (const key of ['state', 'pkce.code_verifier']) {
    const cookie = setCookies.find(value => value.includes(key));
    assert.ok(cookie); assert.match(cookie, /HttpOnly/); assert.match(cookie, /Secure/); assert.match(cookie, /SameSite=Lax/i);
  }
  assert.equal(authConfig({ ...env, GITHUB_EDITOR_ORG: 'example' }).providers[0].options.authorization.params.scope, 'read:org');
});
test('logout clears session, rejects CSRF, and missing/invalid OAuth state fails safely', async () => {
  const values = await csrf();
  const response = await handleAuth(formRequest('signout', { csrfToken: values.csrfToken }, `${values.cookie}; ${await sessionCookie()}`), env);
  assert.equal(response.status, 302);
  assert.ok(response.headers.getSetCookie().some(value => value.startsWith(cookieName(configuration(env))) && /Max-Age=0/i.test(value)));
  const invalid = await handleAuth(formRequest('signout', { csrfToken: 'forged' }, values.cookie), env);
  assert.match(invalid.headers.get('location'), /MissingCSRF/);
  const crossSite = await handleAuth(new Request(`${env.AUTH_URL}/api/auth/signout`, { method: 'POST', headers: { origin: 'https://evil.example' } }), env);
  assert.equal(crossSite.status, 403);
  for (const query of ['?code=fake', '?code=fake&state=forged', '?error=access_denied']) {
    const failed = await handleAuth(request(`/api/auth/callback/github${query}`, 'GET'), env);
    assert.equal(failed.status, 302);
    assert.match(failed.headers.get('location'), /error=/);
    assert.ok(!failed.headers.getSetCookie().some(value => value.startsWith(`${cookieName(configuration(env))}=`) && !/Max-Age=0/i.test(value)));
  }
});
test('complete OAuth callback issues an encrypted identity session using mocked GitHub responses', async () => {
  const values = await csrf();
  const start = await handleAuth(formRequest('signin/github', { csrfToken: values.csrfToken }, values.cookie), env);
  const authorization = new URL(start.headers.get('location'));
  const originalFetch = globalThis.fetch;
  let tokenRequests = 0;
  globalThis.fetch = async (input) => {
    const url = typeof input === 'string' ? input : input.url || String(input);
    if (url === 'https://github.com/login/oauth/access_token') {
      tokenRequests++;
      return Response.json({ access_token: token.githubToken, token_type: 'bearer', scope: '' });
    }
    if (url === 'https://api.github.com/user') return Response.json({ id: 42, login: 'test-owner', name: 'Test Owner', avatar_url: '' });
    throw new Error(`Unexpected external request: ${url}`);
  };
  try {
    const callback = request(`/api/auth/callback/github?code=test-code&state=${encodeURIComponent(authorization.searchParams.get('state'))}`, 'GET', { cookie: cookies(start) });
    const response = await handleAuth(callback, env);
    assert.equal(response.status, 302);
    assert.equal(response.headers.get('location'), env.AUTH_URL);
    assert.equal(tokenRequests, 1);
    const cookie = cookies(response);
    assert.ok(cookie.includes(cookieName(configuration(env))));
    assert.ok(!cookie.includes(token.githubToken));
    assert.equal((await identity(request('/api/identity', 'GET', { cookie }), env, fetchUser)).role, 'super-admin');
  } finally { globalThis.fetch = originalFetch; }
});
test('session output never exposes OAuth tokens; production UI ignores legacy unlocks', async () => {
  const config = authConfig(env);
  const session = await config.callbacks.session({ session: { user: { name: 'test' } }, token });
  assert.ok(!JSON.stringify(session).includes(token.githubToken));
  const source = await readFile(new URL('../lib/capabilities.js', import.meta.url), 'utf8');
  const auth = { user: null };
  globalThis.__testAuth = auth;
  globalThis.window = { location: { hostname: 'topic.earth' }, TOPIC_EARTH_PROFILE: 'dev' };
  globalThis.localStorage = { getItem() { return 'true'; }, setItem() {} };
  const access = await import(`data:text/javascript;base64,${Buffer.from(source.replace("import { GitHubAuth } from './github-auth.mjs';", 'const GitHubAuth = globalThis.__testAuth;')).toString('base64')}`);
  assert.equal(access.AppAccess.can('topic:update'), false);
  access.AppAccess.unlockAdminAccess(true);
  assert.equal(access.AppAccess.getProfile(), 'demo');
  assert.equal(access.AppAccess.can('project:data-write'), false);
  auth.user = { role: 'editor' };
  assert.equal(access.AppAccess.can('topic:update'), true);
  assert.equal(access.AppAccess.can('settings:api'), false);
  assert.equal(access.AppAccess.can('topic:delete'), false);
  auth.user = { role: 'super-admin' };
  assert.equal(access.AppAccess.can('settings:api'), true);
  assert.equal(access.AppAccess.can('layer:delete'), false);
  auth.user = null;
  assert.equal(access.AppAccess.can('topic:update'), false);
  delete globalThis.__testAuth;
  delete globalThis.window;
  delete globalThis.localStorage;
});
