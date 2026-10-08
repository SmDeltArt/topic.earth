// Rasterize deterministic SVG frames with librsvg, then encode the three
// requested animation formats. No browser or remote services are involved.
const fs = require('node:fs');
const path = require('node:path');
const { once } = require('node:events');
const sharp = require('C:/Users/bedes/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'assets/logo/social/formats');
const frames = path.join(root, 'assets/logo/social/.export-earth-frames');
const manifest = JSON.parse(fs.readFileSync(path.join(out, 'manifest.json')));
const fps = 8, duration = 24;
const earth = Array.from({ length: 48 }, (_, i) => 'data:image/png;base64,' + fs.readFileSync(path.join(frames, `${String(i).padStart(3, '0')}.png`)).toString('base64'));
const modes = [
  { key:'world', label:'world update', headline:'World Update', a:'Live Earth signals, climate layers, topic intelligence.', b:'Worldwide context for weather, climate, and public data.' },
  { key:'regional', label:'regional dashboard', headline:'Regional Dashboard', a:'Local initiatives, evidence, and climate signals.', b:'Track places, compare updates, turn observations into topics.' },
  { key:'space', label:'space watch', headline:'Space Watch', a:'Atmosphere missions, orbital context, Earth observation.', b:'Aura, OCO-2, PACE, ozone, and climate imagery.' },
  { key:'fever', label:'fever simulation', headline:'Fever Simulation', a:'Tipping points, scenarios, planetary risk signals.', b:'Explore heat, feedback loops, and transition paths.' }
];
const started = new Date(process.env.TOPIC_EXPORT_CAPTURED_AT || Date.now());
const parts = new Intl.DateTimeFormat('en-GB', { timeZone:'Europe/Brussels', hour:'numeric', minute:'numeric', second:'numeric', hourCycle:'h23' }).formatToParts(started);
const part = type => Number(parts.find(p => p.type === type).value);
const startSeconds = part('hour') * 3600 + part('minute') * 60 + part('second');
sharp.concurrency(2);
sharp.cache({ memory:64, files:0, items:30 });

function compile(svg) {
  const video = svg.match(/<foreignObject\b([^>]*)>[\s\S]*?<\/foreignObject>/);
  if (!video) throw new Error('Missing embedded Earth video');
  const attrs = video[1].replace(/class="[^"]*"\s*/, '');
  const pin = svg.match(/<circle\b[^>]*class="pin"[^>]*cx="([\d.]+)"[^>]*cy="([\d.]+)"/);
  if (!pin) throw new Error('Missing clock pivot');
  const base = svg.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '').replace(/<foreignObject\b[^>]*>[\s\S]*?<\/foreignObject>/, `<image ${attrs} href="EARTH_FRAME" />`);
  const defaults = base.match(/:root \{([^}]+)\}/)?.[1] || '';
  return { base, defaults, pivot:`${pin[1]} ${pin[2]}` };
}

function renderSvg(compiled, item, t) {
  const mode = modes[Math.floor(t / 6) % 4];
  const override = compiled.base.match(new RegExp(':root\\[data-theme="' + mode.key + '"\\] \\{([^}]+)\\}'))?.[1] || '';
  const vars = Object.fromEntries([...`${compiled.defaults};${override}`.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map(m => [m[1], m[2].trim()]));
  let svg = compiled.base.replace(/var\((--[\w-]+)\)/g, (_, k) => vars[k] || '#00d4ff');
  svg = svg.replace('EARTH_FRAME', earth[Math.floor(t * 8) % 48]);
  const seconds = item.clock === 'automatic' ? t * 100 : startSeconds + t;
  const angles = { hour: (seconds / 120) % 360, minute: (seconds / 10) % 360, second: (seconds * 6) % 360 };
  svg = svg.replace(/<line\b([^>]*class="hand (hour|minute|second)-hand"[^>]*)\/>/g, (_, attrs, hand) => `<line ${attrs} transform="rotate(${angles[hand]} ${compiled.pivot})" />`);
  const squareLabel = mode.key === 'fever' ? 'fever scenario' : mode.key;
  const labels = { modeLabel: item.width === item.height || item.height > item.width ? squareLabel : mode.label, headline:mode.headline, infoLineA:mode.a, infoLineB:mode.b };
  for (const [id, value] of Object.entries(labels)) svg = svg.replace(new RegExp('(<text\\b[^>]*id="' + id + '"[^>]*>)[^<]*(</text>)'), `$1${id === 'modeLabel' ? value.toUpperCase() : value}$2`);
  svg = svg.replace(/(<text\b[^>]*class="chip-text"[^>]*>)([^<]*)(<\/text>)/g, (_, open, text, close) => open + text.toUpperCase() + close);
  // Librsvg does not execute CSS keyframes; sample the breathing effects explicitly.
  svg = svg.replace(/(\.rail \{[^}]*opacity:)\s*[\d.]+/, `$1 ${.65 + .25 * Math.sin(t * Math.PI / 3)}`);
  return Buffer.from(svg);
}

async function exportItem(item) {
  const compiled = compile(fs.readFileSync(path.join(out, item.svg), 'utf8'));
  const prefix = path.join(out, item.name);
  const backgrounds = new Map();
  const square = item.width === item.height;
  const s = square ? item.width / 512 : item.width === 1920 ? 1.6 : item.height === 1920 ? 1080 / 512 : 1;
  const x = item.favicon ? 0 : square || item.height === 1920 ? 170 : 208;
  const y = item.favicon ? 0 : square || item.height === 1920 ? 104 : 108;
  const size = item.favicon ? 512 : square || item.height === 1920 ? 172 : 136;
  const dx = item.width === 1500 ? -144 : 0;
  const dy = item.width === 1500 ? 60 : item.width === 1920 ? 36 : item.height === 1920 ? 120 : 0;
  const overlayWidth = Math.round(size * s), left = Math.round(x * s + dx), top = Math.round(y * s + dy);
  const makeFrame = async t => {
    const svg = renderSvg(compiled, item, t).toString();
    const key = Math.floor(t / 6) % 4;
    if (!backgrounds.has(key)) {
      const backdrop = svg.replace(/<image\b[^>]*\/>/, '').replace(/<line\b[^>]*class="hand [^>]*\/>/g, '').replace(/<circle\b[^>]*class="pin"[^>]*\/>/, '');
      backgrounds.set(key, await sharp(Buffer.from(backdrop)).resize(item.width, item.height).ensureAlpha().raw().toBuffer());
    }
    const defs = svg.match(/<defs>[\s\S]*?<\/defs>/)?.[0] || '';
    const style = svg.match(/<style>[\s\S]*?<\/style>/)?.[0] || '';
    const image = svg.match(/<image\b[^>]*\/>/)[0];
    const hands = svg.match(/<line\b[^>]*class="hand [^>]*\/>/g).join('');
    const pin = svg.match(/<circle\b[^>]*class="pin"[^>]*\/>/)[0];
    const overlay = `<svg xmlns="http://www.w3.org/2000/svg" width="${overlayWidth}" height="${overlayWidth}" viewBox="${x} ${y} ${size} ${size}">${defs}${style}<style>:root{background:transparent}</style>${image}<g clip-path="url(#earthClip)">${hands}</g>${pin}</svg>`;
    const pixels = await sharp(Buffer.from(overlay)).ensureAlpha().raw().toBuffer();
    return sharp(backgrounds.get(key), {raw:{width:item.width,height:item.height,channels:4}}).composite([{input:pixels,raw:{width:overlayWidth,height:overlayWidth,channels:4},left,top}]).raw().toBuffer();
  };
  const first = await makeFrame(0);
  await sharp(first, { raw:{ width:item.width, height:item.height, channels:4 } }).png().toFile(prefix + '.png');
  if (process.argv.includes('--posters-only')) return;
  if (!process.argv.includes('--raw')) throw new Error('Use python tools/encode-social-formats.py for animation exports.');
  for (let frame = 0; frame < fps * duration; frame++) {
    const pixels = frame === 0 ? first : await makeFrame(frame / fps);
    if (!process.stdout.write(pixels)) await once(process.stdout, 'drain');
  }
}

(async () => {
  const requested = process.argv.find(a => a.startsWith('--name='))?.slice(7);
  const selected = requested ? manifest.filter(i => i.name === requested) : process.argv.includes('--sample') ? manifest.filter(i => i.name === 'topic-earth-social-1200x630-local') : manifest;
  for (const item of selected) {
    await exportItem(item);
    if (!process.argv.includes('--raw')) console.log(`Exported ${item.name}`);
  }
  if (!process.argv.includes('--raw')) fs.writeFileSync(path.join(out,'export-info.json'),JSON.stringify({ capturedAt:started.toISOString(), localTimeZone:'Europe/Brussels', durationSeconds:duration, fps, automaticClock:'One simulated minute per 600 ms', animation:'Four six-second themes; clocks reset when a recorded loop repeats.', formats:['svg','png','webp','gif','webm'], count:selected.length }, null,2));
})().catch(error => { console.error(error); process.exitCode=1; });
