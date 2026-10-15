import { Auth } from '@auth/core';
import GitHub from '@auth/core/providers/github';
import { getToken } from '@auth/core/jwt';

export const SESSION_SECONDS = 3600;
export function configuration(env = process.env) {
  const url = new URL(env.AUTH_URL || 'https://invalid.local');
  const local = url.protocol === 'http:' && url.hostname === 'localhost'
    && !['production', 'preview'].includes(env.VERCEL_ENV)
    && (!env.VERCEL || env.VERCEL_ENV === 'development');
  if ((!local && url.protocol !== 'https:') || url.username || url.password || url.pathname !== '/' || url.search || url.hash
      || !env.AUTH_URL || !env.AUTH_GITHUB_ID || !env.AUTH_GITHUB_SECRET || (env.AUTH_SECRET || '').length < 32) {
    throw new Error('Authentication is not configured');
  }
  return { origin: url.origin, secure: !local, secret: env.AUTH_SECRET };
}
export const cookieName = config => `${config.secure ? '__Secure-' : ''}topic-earth.session-token`;

export function authConfig(env = process.env) {
  const config = configuration(env);
  return {
    secret: config.secret, basePath: '/api/auth', trustHost: true,
    // Requests use fixed AUTH_URL rather than untrusted Host/forwarding headers.
    useSecureCookies: config.secure,
    session: { strategy: 'jwt', maxAge: SESSION_SECONDS },
    cookies: { sessionToken: { name: cookieName(config), options: {
      httpOnly: true, secure: config.secure, sameSite: 'lax', path: '/'
    } } },
    providers: [GitHub({
      clientId: env.AUTH_GITHUB_ID, clientSecret: env.AUTH_GITHUB_SECRET,
      checks: ['state', 'pkce'],
      authorization: { params: { scope: env.GITHUB_EDITOR_ORG ? 'read:org' : '' } },
      userinfo: { url: 'https://api.github.com/user', async request({ tokens }) {
        return github('/user', tokens.access_token);
      } }
    })],
    callbacks: {
      async jwt({ token, account, profile }) {
        if (account) {
          if (!Number.isSafeInteger(profile?.id) || profile.id <= 0 || !account.access_token) throw new Error('Invalid identity');
          token.githubId = String(profile.id);
          token.githubToken = account.access_token;
          token.signedInAt = Math.floor(Date.now() / 1000);
        }
        return token;
      },
      async session({ session, token }) {
        if (Date.now() / 1000 >= token.signedInAt + SESSION_SECONDS) return null;
        return { expires: new Date((token.signedInAt + SESSION_SECONDS) * 1000).toISOString(),
          user: { id: token.githubId, name: session.user?.name || '' } };
      },
      async redirect({ url }) {
        return url === config.origin || url.startsWith(`${config.origin}/`) ? url : config.origin;
      }
    },
    logger: { error() { console.error('[Auth] Authentication failed'); }, warn() {}, debug() {} }
  };
}
export async function github(path, accessToken, fetcher = fetch) {
  const response = await fetcher(`https://api.github.com${path}`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28' }, signal: AbortSignal.timeout(5000), cache: 'no-store'
  });
  if (!response.ok) throw new Error('GitHub verification failed');
  return response.json();
}
export async function resolveIdentity(token, env = process.env, fetcher = fetch, now = Date.now() / 1000) {
  if (!token?.githubToken || !/^\d+$/.test(token.githubId || '') || !Number.isFinite(token.signedInAt)
      || now >= token.signedInAt + SESSION_SECONDS || token.signedInAt > now) return null;
  const user = await github('/user', token.githubToken, fetcher);
  if (!Number.isSafeInteger(user.id) || String(user.id) !== token.githubId || typeof user.login !== 'string') return null;
  let role = 'user';
  const owners = String(env.GITHUB_SUPER_ADMIN_IDS || '').split(',').map(id => id.trim()).filter(Boolean);
  const validOwners = owners.every(id => /^[1-9]\d*$/.test(id));
  if (validOwners && owners.includes(String(user.id))) role = 'super-admin';
  else if (validOwners && env.GITHUB_EDITOR_ORG) {
    const org = encodeURIComponent(env.GITHUB_EDITOR_ORG);
    const path = env.GITHUB_EDITOR_TEAM
      ? `/orgs/${org}/teams/${encodeURIComponent(env.GITHUB_EDITOR_TEAM)}/memberships/${encodeURIComponent(user.login)}`
      : `/user/memberships/orgs/${org}`;
    try {
      const membership = await github(path, token.githubToken, fetcher);
      if (membership.state === 'active') role = 'editor';
    } catch { /* Membership errors never grant privileges. */ }
  }
  return { id: String(user.id), login: user.login, role };
}
export async function identity(request, env = process.env, fetcher = fetch) {
  const config = configuration(env);
  const headers = new Headers(request.headers);
  headers.delete('authorization'); // Cookie sessions only; no alternate browser-supplied identity channel.
  const token = await getToken({ req: { headers }, secret: config.secret, cookieName: cookieName(config),
    salt: cookieName(config), secureCookie: config.secure });
  return resolveIdentity(token, env, fetcher);
}
export function can(user, permission) {
  if (permission === 'owner:manage') return user?.role === 'super-admin';
  if (permission === 'content:write' || permission === 'ai:apply-to-topic') return ['editor', 'super-admin'].includes(user?.role);
  return false;
}
export async function requirePermission(request, permission, env = process.env, fetcher = fetch) {
  const config = configuration(env);
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) throw Object.assign(new Error('Writes require an unsafe method'), { status: 405 });
  if (request.headers.get('origin') !== config.origin || request.headers.get('sec-fetch-site') === 'cross-site') {
    throw Object.assign(new Error('Origin not allowed'), { status: 403 });
  }
  const user = await identity(request, env, fetcher);
  if (!user) throw Object.assign(new Error('Sign in required'), { status: 401 });
  if (!can(user, permission)) throw Object.assign(new Error('Forbidden'), { status: 403 });
  return user;
}
export async function handleAuth(request, env = process.env) {
  const config = configuration(env);
  const incoming = new URL(request.url);
  const canonical = new URL(incoming.pathname + incoming.search, config.origin);
  if (request.method === 'POST' && request.headers.get('origin') !== config.origin) {
    return Response.json({ error: 'Origin not allowed' }, { status: 403 });
  }
  const headers = new Headers(request.headers);
  for (const name of ['host', 'x-forwarded-host', 'x-forwarded-proto']) headers.delete(name);
  return Auth(new Request(canonical, { method: request.method, headers,
    ...(!['GET', 'HEAD'].includes(request.method) ? { body: await request.text() } : {}) }), authConfig(env));
}
