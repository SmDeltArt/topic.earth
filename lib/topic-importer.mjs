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
export async function readTopicZip(file) {
  const files = await readZipEntries(file);
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
  return rawTopics.map((topic, index) => {
    if (!topic || typeof topic.title !== 'string' || !topic.title.trim() || !Number.isFinite(Number(topic.lat)) || !Number.isFinite(Number(topic.lon)) || Math.abs(Number(topic.lat)) > 90 || Math.abs(Number(topic.lon)) > 180) throw new Error(`Invalid title or coordinates in topic ${index + 1}.`);
    const category = String(topic.category || 'imported-topics');
    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(category)) throw new Error('Invalid topic layer ID.');
    const stableId = topic.id ?? crc32(new TextEncoder().encode(JSON.stringify(topic)));
    const id = `review-import-${String(stableId).replace(/[^\w.-]/g, '-').slice(0, 100)}`;
    if (seen.has(id)) throw new Error('Duplicate topic IDs in ZIP.');
    seen.add(id);
    return { ...topic, id, category, reviewState: 'needs-review',
      lat: Number(topic.lat), lon: Number(topic.lon), isCustom: true,
      topicStatus: 'browser-draft', review: { needsHumanReview: true, stage: 'admin-review', requestedBy: 'zip-upload' },
      storage: { origin: 'browser-localStorage', savedAt: new Date().toISOString(), publishedAt: '' },
      media: (Array.isArray(topic.media) ? topic.media : []).map(mediaUrl).filter(Boolean),
      mediaTokens: (Array.isArray(topic.mediaTokens) ? topic.mediaTokens : []).map(token => ({ ...token, url: mediaUrl(token.packagedUrl || token.url) })).filter(token => token.url)
    };
  });
}
