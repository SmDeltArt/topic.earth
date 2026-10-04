import { translationIsCurrent } from './topic-translations.mjs';
import { scanZipContents } from './zip-content-scan.mjs';
// Read topic.earth review ZIPs without extracting files or running archive code.
const LIMIT = 40 * 1024 * 1024;
const decoder = new TextDecoder();
function crc32(bytes) {
  let crc = -1;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ -1) >>> 0;
}
export async function readZipEntries(file) {
  if (file.size > LIMIT) throw new Error('ZIP must be smaller than 40 MB.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.length < 22) throw new Error("Invalid ZIP archive.");
  const view = new DataView(bytes.buffer);
  let end = bytes.length - 22;
  while (end >= Math.max(0, bytes.length - 65557) && view.getUint32(end, true) !== 0x06054b50) end--;
  if (end < 0 || end < bytes.length - 65557) throw new Error('Invalid ZIP directory.');
  const count = view.getUint16(end + 10, true);
  if (count > 1000 || view.getUint16(end + 4, true) || view.getUint16(end + 6, true)) throw new Error('Unsupported ZIP archive.');
  let offset = view.getUint32(end + 16, true), total = 0;
  const files = new Map();
  for (let i = 0; i < count; i++) {
    if (offset + 46 > bytes.length || view.getUint32(offset, true) !== 0x02014b50) throw new Error('Invalid ZIP entry.');
    const flags = view.getUint16(offset + 8, true), method = view.getUint16(offset + 10, true);
    const crc = view.getUint32(offset + 16, true), size = view.getUint32(offset + 20, true), expanded = view.getUint32(offset + 24, true);
    const nameLength = view.getUint16(offset + 28, true), extra = view.getUint16(offset + 30, true), comment = view.getUint16(offset + 32, true);
    const local = view.getUint32(offset + 42, true);
    const name = decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameLength)).replace(/\\/g, '/');
    offset += 46 + nameLength + extra + comment;
    total += expanded;
    if (total > LIMIT || flags & 1 || ![0, 8].includes(method)) throw new Error('ZIP is encrypted, unsupported, or too large.');
    if (name.startsWith('/') || name.includes(':') || name.split('/').includes('..') || files.has(name)) throw new Error('Unsafe or duplicate ZIP path.');
    if (local + 30 > bytes.length || view.getUint32(local, true) !== 0x04034b50) throw new Error('Invalid ZIP data.');
    const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
    if (start + size > bytes.length) throw new Error('Truncated ZIP data.');
    let data = bytes.slice(start, start + size);
    if (method === 8) {
      const reader = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();
      const chunks = []; let length = 0;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        length += value.length;
        if (length > expanded || length > LIMIT) { await reader.cancel(); throw new Error('ZIP data exceeds declared size.'); }
        chunks.push(value);
      }
      data = new Uint8Array(await new Blob(chunks).arrayBuffer());
    }
    if (data.length !== expanded || crc32(data) !== crc) throw new Error('ZIP checksum mismatch.');
    files.set(name, data);
  }
  return files;
}
function asDataUrl(bytes, mime) {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 8192) binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  return `data:${mime};base64,${btoa(binary)}`;
}
export async function scanTopicZip(file) {
  let report = { passed: false, compressedBytes: file.size, expandedBytes: 0, files: [], warnings: [] };
  try {
    const files = await readZipEntries(file);
    report = scanZipContents(files, file.size);
    if (!report.passed) return { report, topics: [] };
    const topics = readTopicFiles(files);
    const importedAt = new Date();
    const parts = new Intl.DateTimeFormat('en-GB', { year: '2-digit', month: '2-digit', day: '2-digit' }).formatToParts(importedAt);
    const dateYYMMDD = ['year', 'month', 'day'].map(type => parts.find(part => part.type === type).value).join('');
    const zipName = String(file.name || '').split(/[\\/]/).pop().replace(/[\u0000-\u001f]/g, '').slice(0, 200);
    for (const topic of topics) {
      topic.storage.sourceZipName = zipName;
      topic.storage.sourceZipDateYYMMDD = dateYYMMDD;
      topic.storage.sourceZipImportedAt = importedAt.toISOString();
    }
    return { report, topics };
  } catch (error) {
    report.passed = false;
    report.error = error.message;
    return { report, topics: [] };
  }
}

export async function readTopicZip(file) {
  const result = await scanTopicZip(file);
  if (!result.report.passed) throw new Error(result.report.error || result.report.files.filter(entry => entry.status === 'blocked').map(entry => `${entry.path}: ${entry.reason}`).join('\n'));
  return result.topics;
}

function readTopicFiles(files) {
  const topicPath = [...files.keys()].find(name => /(^|\/)data\/custom-topics\.json$/.test(name))
    || [...files.keys()].find(name => /(^|\/)topic\.json$/.test(name));
  if (!topicPath) throw new Error('No topic data found. Use a topic.earth topic ZIP.');
  const parsed = JSON.parse(decoder.decode(files.get(topicPath)));
  const rawTopics = Array.isArray(parsed) ? parsed : [parsed];
  if (!rawTopics.length || rawTopics.length > 500) throw new Error('ZIP must contain between 1 and 500 topics.');
  const prefix = topicPath.includes('data/') ? topicPath.slice(0, topicPath.lastIndexOf('data/')) : '';
  const mediaUrl = value => {
    const url = String(value || '');
    const bytes = files.get(prefix + url);
    if (bytes) {
      const extension = url.split('.').pop().toLowerCase();
      const mime = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', avif: 'image/avif', mp4: 'video/mp4', webm: 'video/webm', mp3: 'audio/mpeg', wav: 'audio/wav' }[extension];
      return mime ? asDataUrl(bytes, mime) : '';
    }
    return /^https?:\/\//i.test(url) ? url : '';
  };
  const seen = new Set();
  // Only passive prose markup is retained in topic fields rendered in the main page.
  // Story documents are rendered separately inside their existing sandbox.
  const passiveHtml = value => typeof value !== 'string' ? value : value.replace(/<[^>]*>/g, tag => {
    const match = /^<\s*(\/?)\s*(p|br|div|span|h[1-6]|strong|b|em|i|u|s|ul|ol|li|blockquote|pre|code|table|thead|tbody|tr|td|th|hr)\b[^>]*>$/i.exec(tag);
    return match ? `<${match[1]}${match[2].toLowerCase()}>` : tag.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  });
  return rawTopics.map((topic, index) => {
    if (!topic || typeof topic.title !== 'string' || !topic.title.trim() || !Number.isFinite(Number(topic.lat)) || !Number.isFinite(Number(topic.lon)) || Math.abs(Number(topic.lat)) > 90 || Math.abs(Number(topic.lon)) > 180) throw new Error(`Invalid title or coordinates in topic ${index + 1}.`);
    const category = String(topic.category || 'imported-topics');
    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(category)) throw new Error('Invalid topic layer ID.');
    const stableId = topic.id ?? crc32(new TextEncoder().encode(JSON.stringify(topic)));
    const id = `review-import-${String(stableId).replace(/[^\w.-]/g, '-').slice(0, 100)}`;
    if (seen.has(id)) throw new Error('Duplicate topic IDs in ZIP.');
    seen.add(id);
    const translations = { ...(topic.translations || {}) };
    for (const [language, ref] of Object.entries(topic.translationFiles || {})) {
      const bytes = files.get(prefix + ref?.url);
      if (!bytes) continue;
      const record = JSON.parse(decoder.decode(bytes));
      if (translationIsCurrent(record, topic, language)) translations[language] = record;
    }
    const safeTopic = { ...topic };
    for (const field of ['summary', 'insight', 'ttsText', 'source', 'region', 'country', 'date']) {
      if (topic[field] !== undefined && typeof topic[field] !== 'string') throw new Error(`Invalid text field ${field} in topic ${index + 1}.`);
      if (topic[field] !== undefined) safeTopic[field] = passiveHtml(topic[field]);
    }
    for (const record of Object.values(translations)) {
      if (!record || typeof record !== 'object') continue;
      for (const field of ['summary', 'insight']) record[field] = passiveHtml(record[field]);
    }
    if (topic.topicStory) safeTopic.topicStory = { ...topic.topicStory, scriptsAllowed: false };
    return { ...safeTopic, translations, translationFiles: {}, id, category, reviewState: 'needs-review',
      lat: Number(topic.lat), lon: Number(topic.lon), isCustom: true,
      topicStatus: 'browser-draft', review: { needsHumanReview: true, stage: 'admin-review', requestedBy: 'zip-upload' },
      storage: { origin: 'browser-localStorage', savedAt: new Date().toISOString(), publishedAt: '' },
      media: (Array.isArray(topic.media) ? topic.media : []).map(mediaUrl).filter(Boolean),
      mediaTokens: (Array.isArray(topic.mediaTokens) ? topic.mediaTokens : []).map(token => ({ ...token, url: mediaUrl(token.packagedUrl || token.url) })).filter(token => token.url)
    };
  });
}
