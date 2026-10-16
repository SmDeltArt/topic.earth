import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import handler from '../api/nasa-gistemp.mjs';

const dataset = 'Land-Ocean: Global Means\n2026 112 113 114 115 116 117 118 119 120 *** *** ***\n';
const response = () => ({ headers: {}, setHeader(key, value) { this.headers[key] = value; },
  status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; }, send(body) { this.body = body; return this; } });
const originalFetch = globalThis.fetch;
try {
  let requested;
  globalThis.fetch = async (url, options) => {
    requested = url;
    assert.equal(options.redirect, 'error');
    return new Response(dataset);
  };
  const ok = response();
  await handler({ method: 'GET', query: { url: 'https://evil.example' } }, ok);
  assert.equal(requested, 'https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.txt');
  assert.equal(ok.statusCode, 200);
  assert.equal(ok.body, dataset);
  assert.match(ok.headers['Cache-Control'], /s-maxage=3600/);
  const denied = response();
  await handler({ method: 'POST' }, denied);
  assert.equal(denied.statusCode, 405);
  for (const result of [new Response('unavailable', { status: 500 }), new Response('<html>Not data</html>')]) {
    globalThis.fetch = async () => result;
    const failed = response();
    await handler({ method: 'GET' }, failed);
    assert.equal(failed.statusCode, 503);
    assert.equal(failed.headers['Cache-Control'], 'no-store');
  }
  globalThis.fetch = async () => { throw new Error('timeout'); };
  const timedOut = response();
  await handler({ method: 'GET' }, timedOut);
  assert.equal(timedOut.statusCode, 503);
} finally { globalThis.fetch = originalFetch; }

const source = (await readFile(new URL('../lib/climate-indicators.js', import.meta.url), 'utf8'))
  .replace(/^import .*;\r?\n/gm, '').replace(/^export /gm, '');
const context = vm.createContext({ Date, console, createOnlineSignalSnapshot: input => input });
vm.runInContext(source + '\nglobalThis.load = fetchClimateIndicatorSnapshot;', context);
const urls = [];
const snapshot = await context.load({ fetchImpl: async url => {
  urls.push(url);
  return new Response(url === '/api/nasa-gistemp' ? dataset : '2026,9,2026.7,426.5\n');
} });
assert.equal(urls[0], '/api/nasa-gistemp');
assert.equal(snapshot.sourceStatus, 'live');
const temperature = snapshot.signals.find(signal => signal.climateIndicator.indicator === 'global-temperature-anomaly');
assert.equal(temperature.climateIndicator.value, 1.2);
assert.equal(temperature.sourceUrl, 'https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.txt');
const degraded = await context.load({ fetchImpl: async () => { throw new Error('offline'); } });
assert.equal(degraded.sourceStatus, 'fallback');
assert.equal(degraded.errors.length, 2);
console.log('Fixed NASA proxy, cache/error policy, denied writes, same-origin climate fetch, parsing, provenance and offline fallback passed.');
