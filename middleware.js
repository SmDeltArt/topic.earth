// Use a schema-compatible .js entrypoint; keep the tested implementation as ESM.
import middleware from './middleware.mjs';
export const config = { runtime: 'nodejs', matcher: ['/:path*'] };
export default middleware;
