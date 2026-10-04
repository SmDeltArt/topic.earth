// Local content policy checks. This is not an antivirus or a verdict on factual accuracy.
const TEXT_LIMIT = 2 * 1024 * 1024;
const MEDIA_LIMIT = 20 * 1024 * 1024;
const decoder = new TextDecoder('utf-8', { fatal: true });
const TEXT_TYPES = new Set(['json', 'html', 'htm', 'txt', 'md', 'svg']);
const MEDIA_TYPES = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif', 'avif', 'mp4', 'webm', 'mp3', 'wav']);

function decodedText(text) {
  return text.replace(/&#(x[\da-f]+|\d+);?/gi, (_, code) => {
    const value = code[0].toLowerCase() === 'x' ? parseInt(code.slice(1), 16) : Number(code);
    return value <= 0x10ffff ? String.fromCodePoint(value) : '';
  }).replace(/&colon;/gi, ':').replace(/&(?:tab|newline);/gi, '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
}

function checkText(text) {
  if (text.includes('\0')) throw new Error('Null bytes in text');
  const decoded = decodedText(text);
  if (/<\s*\/?\s*(?:script|iframe|object|embed|applet|base|form|input|button|foreignobject|animate|animatetransform|set)\b/i.test(decoded)
    || /\bon[\w:-]+\s*=|\bsrcdoc\s*=|\bhttp-equiv\s*=/i.test(decoded)
    || /(?:javascript|vbscript)\s*:|data\s*:\s*(?:text\/html|application\/(?:javascript|xhtml\+xml)|image\/svg\+xml)/i.test(decoded)
    || /@import\b|expression\s*\(|url\s*\(/i.test(decoded)) {
    throw new Error('Active HTML, script handlers, or unsafe URLs/CSS');
  }
  // Inspect inert template content, never attach it or load remote markup resources.
  if (typeof document !== 'undefined' && decoded.includes('<')) {
    const template = document.createElement('template');
    template.innerHTML = decoded;
    for (const node of template.content.querySelectorAll('*')) {
      for (const attr of node.attributes) {
        const name = attr.name.toLowerCase();
        const value = attr.value.replace(/[\s\u0000-\u001f]/g, '');
        if (name.startsWith('on') || ['srcdoc', 'http-equiv', 'is'].includes(name)) throw new Error('Active HTML attributes');
        if (['href', 'src', 'xlink:href', 'action', 'formaction', 'poster'].includes(name)
          && (/^(?:javascript|vbscript):/i.test(value) || (/^data:/i.test(value) && !/^data:image\/(?:png|jpeg|gif|webp);base64,/i.test(value)))) throw new Error('Unsafe HTML URL');
      }
    }
  }
}

function checkJson(value, depth = 0) {
  if (depth > 40) throw new Error('JSON nesting exceeds 40 levels');
  if (typeof value === 'string') checkText(value);
  else if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      if (['__proto__', 'prototype', 'constructor'].includes(key)) throw new Error('Unsafe JSON property');
      checkJson(child, depth + 1);
    }
  }
}

function matchesMedia(bytes, type) {
  const ascii = (start, length) => String.fromCharCode(...bytes.slice(start, start + length));
  const starts = values => values.every((value, index) => bytes[index] === value);
  if (type === 'png') return bytes.length >= 24 && starts([137, 80, 78, 71, 13, 10, 26, 10]) && ascii(12, 4) === 'IHDR';
  if (['jpg', 'jpeg'].includes(type)) return bytes.length >= 4 && starts([255, 216, 255]);
  if (type === 'gif') return bytes.length >= 13 && ['GIF87a', 'GIF89a'].includes(ascii(0, 6));
  if (type === 'webp') return bytes.length >= 16 && ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP';
  if (['avif', 'mp4'].includes(type)) return bytes.length >= 16 && ascii(4, 4) === 'ftyp'
    && (type !== 'avif' || /avif|avis/.test(ascii(8, Math.min(bytes.length - 8, 24))));
  if (type === 'webm') return bytes.length >= 8 && starts([26, 69, 223, 163]);
  if (type === 'wav') return bytes.length >= 16 && ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WAVE';
  if (type === 'mp3') return bytes.length >= 4 && (ascii(0, 3) === 'ID3' || (bytes[0] === 255 && (bytes[1] & 224) === 224));
  return false;
}

export function scanZipContents(files, compressedBytes) {
  const report = { passed: true, compressedBytes, expandedBytes: 0, files: [], warnings: [
    'Local file/content checks only; antivirus not connected. Remote URLs are not downloaded or scanned.'
  ] };
  for (const [path, bytes] of files) {
    const entry = { path, size: bytes.length, status: 'checked', reason: '' };
    report.expandedBytes += bytes.length;
    try {
      if (path.endsWith('/') && !bytes.length) { entry.status = 'ignored'; entry.reason = 'Directory'; }
      else if (/(^|\/)data\/custom-topics\.js$/i.test(path)) {
        entry.status = 'ignored'; entry.reason = 'Legacy generated JS copy excluded; only JSON is imported';
      } else {
        const type = path.split('.').pop().toLowerCase();
        if (!TEXT_TYPES.has(type) && !MEDIA_TYPES.has(type)) throw new Error('File type not allowed (code, executables and nested archives are blocked)');
        if (bytes.length > (TEXT_TYPES.has(type) ? TEXT_LIMIT : MEDIA_LIMIT)) throw new Error(`File exceeds ${TEXT_TYPES.has(type) ? 2 : 20} MB limit`);
        if (TEXT_TYPES.has(type)) {
          const text = decoder.decode(bytes);
          if (type === 'json') checkJson(JSON.parse(text)); else checkText(text);
        } else if (!matchesMedia(bytes, type)) throw new Error('File signature does not match its media extension');
      }
    } catch (error) { entry.status = 'blocked'; entry.reason = error.message; report.passed = false; }
    report.files.push(entry);
  }
  return report;
}
