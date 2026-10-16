import { next } from '@vercel/functions';
import { requestAllowed } from './server/request-policy.mjs';
export const config = { runtime: 'nodejs', matcher: ['/:path*'] };
export default async function middleware(request) {
  return await requestAllowed(request) ? next() : Response.json({ error: 'Operation not enabled' }, {
    status: 403, headers: { 'Cache-Control': 'no-store' }
  });
}
