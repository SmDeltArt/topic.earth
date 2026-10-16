// The root package is CommonJS. Load ESM dynamically so Vercel does not emit
// require('./middleware.mjs'), which its Node runtime rejects.
module.exports = async function middleware(request) {
  const { default: handler } = await import('./middleware.mjs');
  return handler(request);
};
module.exports.config = { runtime: 'nodejs', matcher: ['/:path*'] };
