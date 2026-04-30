import { LocalStorage } from './storage.js';

const CUSTOM_POINTS_KEY = 'euroearth_custom_points';
const PACKAGE_TYPE = 'admin-review-package';
const PACKAGE_STATUS = 'downloaded-request';
const TOPIC_SUBMISSION_PACKAGE_TYPE = 'single-topic-admin-submission';
const ADMIN_SUBMISSION_EMAIL = '';

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date = new Date()) {
  const year = Math.max(1980, date.getFullYear());
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const day = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, day };
}

function writeUint16(view, offset, value) {
  view.setUint16(offset, value, true);
}

function writeUint32(view, offset, value) {
  view.setUint32(offset, value >>> 0, true);
}

function concatBytes(parts) {
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(totalLength);
  let offset = 0;

  parts.forEach((part) => {
    output.set(part, offset);
    offset += part.length;
  });

  return output;
}

function toBytes(value) {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  return new TextEncoder().encode(String(value));
}

function createStoredZip(files) {
  const encoder = new TextEncoder();
  const now = new Date();
  const { time, day } = dosDateTime(now);
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  files.forEach((file) => {
    const nameBytes = encoder.encode(file.path.replace(/\\/g, '/'));
    const dataBytes = toBytes(file.data);
    const crc = crc32(dataBytes);

    const localHeader = new Uint8Array(30 + nameBytes.length);
    const localView = new DataView(localHeader.buffer);
    writeUint32(localView, 0, 0x04034b50);
    writeUint16(localView, 4, 20);
    writeUint16(localView, 6, 0);
    writeUint16(localView, 8, 0);
    writeUint16(localView, 10, time);
    writeUint16(localView, 12, day);
    writeUint32(localView, 14, crc);
    writeUint32(localView, 18, dataBytes.length);
    writeUint32(localView, 22, dataBytes.length);
    writeUint16(localView, 26, nameBytes.length);
    writeUint16(localView, 28, 0);
    localHeader.set(nameBytes, 30);

    localParts.push(localHeader, dataBytes);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const centralView = new DataView(centralHeader.buffer);
    writeUint32(centralView, 0, 0x02014b50);
    writeUint16(centralView, 4, 20);
    writeUint16(centralView, 6, 20);
    writeUint16(centralView, 8, 0);
    writeUint16(centralView, 10, 0);
    writeUint16(centralView, 12, time);
    writeUint16(centralView, 14, day);
    writeUint32(centralView, 16, crc);
    writeUint32(centralView, 20, dataBytes.length);
    writeUint32(centralView, 24, dataBytes.length);
    writeUint16(centralView, 28, nameBytes.length);
    writeUint16(centralView, 30, 0);
    writeUint16(centralView, 32, 0);
    writeUint16(centralView, 34, 0);
    writeUint16(centralView, 36, 0);
    writeUint32(centralView, 38, 0);
    writeUint32(centralView, 42, offset);
    centralHeader.set(nameBytes, 46);
    centralParts.push(centralHeader);

    offset += localHeader.length + dataBytes.length;
  });

  const centralDirectory = concatBytes(centralParts);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  writeUint32(endView, 0, 0x06054b50);
  writeUint16(endView, 4, 0);
  writeUint16(endView, 6, 0);
  writeUint16(endView, 8, files.length);
  writeUint16(endView, 10, files.length);
  writeUint32(endView, 12, centralDirectory.length);
  writeUint32(endView, 16, offset);
  writeUint16(endView, 20, 0);

  return new Blob([...localParts, centralDirectory, end], { type: 'application/zip' });
}

function readCustomTopics() {
  try {
    const raw = localStorage.getItem(CUSTOM_POINTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error('[Topic Package] Failed to read custom topics:', error);
    return [];
  }
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function safeSegment(value, fallback = 'topic') {
  const text = String(value || fallback)
    .normalize('NFKD')
    .replace(/[^\w.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

  return text || fallback;
}

function mimeToExtension(mime = '') {
  const clean = mime.split(';')[0].trim().toLowerCase();
  const map = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/svg+xml': 'svg',
    'image/avif': 'avif'
  };
  return map[clean] || 'bin';
}

function extensionFromUrl(url = '') {
  try {
    const pathname = new URL(url, window.location.href).pathname;
    const match = pathname.match(/\.([a-z0-9]{2,5})$/i);
    return match ? match[1].toLowerCase() : '';
  } catch {
    return '';
  }
}

function dataUrlToBytes(dataUrl) {
  const match = dataUrl.match(/^data:([^;,]+)?(;base64)?,(.*)$/);
  if (!match) return null;

  const mime = match[1] || 'application/octet-stream';
  const isBase64 = Boolean(match[2]);
  const payload = match[3] || '';
  let bytes;

  if (isBase64) {
    const binary = atob(payload);
    bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
  } else {
    bytes = new TextEncoder().encode(decodeURIComponent(payload));
  }

  return { bytes, mime, extension: mimeToExtension(mime) };
}

function getTopicMediaRefs(topic = {}) {
  const mediaTokens = Array.isArray(topic.mediaTokens) ? topic.mediaTokens : [];
  if (mediaTokens.length > 0) return mediaTokens;

  return (Array.isArray(topic.media) ? topic.media : []).map(url => ({ url }));
}

function hasMediaReference(ref = {}) {
  if (typeof ref === 'string') return Boolean(ref);
  return Boolean(ref.url || ref.sourceUrl || ref.browserAssetKey);
}

async function fetchMediaBytes(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const blob = await response.blob();
  return {
    bytes: new Uint8Array(await blob.arrayBuffer()),
    mime: blob.type || 'application/octet-stream',
    extension: extensionFromUrl(url) || mimeToExtension(blob.type)
  };
}

async function packageMedia(mediaUrl, topicSlug, index, files, manifest, mediaToken = null) {
  let original = String(mediaUrl || mediaToken?.url || mediaToken?.sourceUrl || '');
  const browserAssetKey = mediaToken?.browserAssetKey || '';
  const linkedReferenceOnly = !mediaUrl && !mediaToken?.url && Boolean(mediaToken?.sourceUrl);
  const baseMeta = {
    index,
    original: original || (browserAssetKey ? `browser-cache:${browserAssetKey}` : ''),
    sourceUrl: mediaToken?.sourceUrl || '',
    sourceName: mediaToken?.sourceName || '',
    browserAssetKey,
    packaged: false,
    path: null,
    reason: null
  };

  if (!original && browserAssetKey) {
    try {
      const record = await LocalStorage.getBrowserAsset(browserAssetKey);
      if (record?.dataUrl) {
        original = record.dataUrl;
      }
    } catch (error) {
      manifest.warnings.push(`Browser cached media for ${topicSlug} item ${index + 1} could not be read: ${error.message || String(error)}`);
    }
  }

  if (!original) {
    const meta = { ...baseMeta, reason: browserAssetKey ? 'browser-cache-missing' : 'empty-media-url' };
    manifest.assets.push(meta);
    return { mediaValue: original, meta };
  }

  if (linkedReferenceOnly) {
    const referencePath = `assets/${topicSlug}/media-${index + 1}.url.txt`;
    files.push({
      path: referencePath,
      data: `Linked media or source URL kept for admin review.\n\nURL:\n${original}\n\nThis may be a YouTube video, website, document, or source page rather than a direct image file.\n`
    });

    const meta = {
      ...baseMeta,
      referencePath,
      reason: 'linked-media-reference'
    };

    manifest.assets.push(meta);
    return { mediaValue: original, meta };
  }

  try {
    let media;
    if (original.startsWith('data:')) {
      media = dataUrlToBytes(original);
      if (!media) throw new Error('Invalid data URL');
    } else {
      media = await fetchMediaBytes(original);
    }

    const extension = media.extension || 'bin';
    const path = `assets/${topicSlug}/media-${index + 1}.${extension}`;
    files.push({ path, data: media.bytes });

    const meta = {
      ...baseMeta,
      packaged: true,
      path,
      mime: media.mime,
      size: media.bytes.length
    };

    manifest.assets.push(meta);
    return { mediaValue: path, meta };
  } catch (error) {
    const referencePath = `assets/${topicSlug}/media-${index + 1}.url.txt`;
    files.push({
      path: referencePath,
      data: `Media could not be embedded by the browser package process.\n\nOriginal URL or browser cache reference:\n${original}\n\nReason:\n${error.message || String(error)}\n`
    });

    const meta = {
      ...baseMeta,
      referencePath,
      reason: error.message || String(error)
    };

    manifest.assets.push(meta);
    manifest.warnings.push(`Media for ${topicSlug} item ${index + 1} kept as URL reference: ${meta.reason}`);
    return { mediaValue: original, meta };
  }
}

function buildReadme(manifest) {
  return `# topic.earth Admin Review Package

Downloaded: ${manifest.downloadedAt}
Drafts: ${manifest.topicCount}
Packaged media assets: ${manifest.assets.filter((asset) => asset.packaged).length}
Warnings: ${manifest.warnings.length}
${manifest.adminContactEmail ? `Admin contact: ${manifest.adminContactEmail}\n` : ''}

## Files

- manifest.json: package metadata and media packaging status
- data/custom-topics.json: browser drafts ready for admin review
- data/custom-topics.js: same topics as an ES module export
- data/localStorage-euroearth_custom_points.json: raw browser storage snapshot
- assets/: packaged images, when the browser could embed, fetch, or read them from this browser cache

## Admin Workflow

1. Review data/custom-topics.json.
2. Approve, edit, or reject each downloaded request.
3. Move packaged assets into the app public assets folder or storage bucket.
4. Copy approved topics into the app data layer or future backend.
5. Update topic media paths if your final storage path differs.
${manifest.adminContactEmail ? `\nFor the local phase, attach this ZIP to an email addressed to ${manifest.adminContactEmail}. Browser mail links cannot attach files automatically.\n` : ''}

Remote image URLs may be preserved when the browser could not fetch the image because of CORS or network restrictions. Inline browser-only images are exported only if they still exist in this browser's IndexedDB cache.
`;
}

async function buildTopicPackage(topics, options = {}) {
  const exportedAt = new Date().toISOString();
  const packageType = options.packageType || PACKAGE_TYPE;
  const packageStatus = options.status || PACKAGE_STATUS;
  const adminEmail = options.adminEmail || '';
  const files = [];
  const manifest = {
    version: 1,
    app: 'topic.earth',
    packageType,
    status: packageStatus,
    source: options.source || 'browser-localStorage',
    storageKey: CUSTOM_POINTS_KEY,
    adminContactEmail: adminEmail,
    exportedAt,
    downloadedAt: exportedAt,
    workflow: {
      from: options.workflowFrom || 'browser-draft',
      next: options.workflowNext || 'admin-review',
      publishStep: options.publishStep || 'approved-topic'
    },
    topicCount: topics.length,
    assets: [],
    warnings: []
  };

  const packagedTopics = [];

  for (const topic of topics) {
    const topicCopy = cloneJson(topic);
    const topicSlug = `${safeSegment(topicCopy.id, 'topic')}-${safeSegment(topicCopy.title, 'untitled')}`.slice(0, 100);
    const media = Array.isArray(topicCopy.media) ? topicCopy.media : [];
    const mediaRefs = getTopicMediaRefs(topicCopy);
    const mediaAssets = [];
    const packagedMedia = [];

    for (let i = 0; i < mediaRefs.length; i += 1) {
      const mediaToken = mediaRefs[i] || {};
      const mediaUrl = mediaToken.url || media[i] || '';
      const result = await packageMedia(mediaUrl, topicSlug, i, files, manifest, mediaToken);
      packagedMedia.push(result.mediaValue);
      mediaAssets.push(result.meta);
    }

    topicCopy.media = packagedMedia;
    topicCopy.mediaAssets = mediaAssets;
    topicCopy.topicStatus = packageStatus;
    topicCopy.review = {
      ...(topicCopy.review && typeof topicCopy.review === 'object' ? topicCopy.review : {}),
      needsHumanReview: true,
      stage: 'admin-review',
      downloadedForAdminAt: exportedAt,
      missing: Array.isArray(topicCopy.review?.missing) ? topicCopy.review.missing : []
    };
    topicCopy.storage = {
      ...(topicCopy.storage && typeof topicCopy.storage === 'object' ? topicCopy.storage : {}),
      origin: topicCopy.storage?.origin || 'browser-localStorage',
      downloadedAt: exportedAt
    };
    topicCopy.adminRequest = {
      packageType,
      status: packageStatus,
      downloadedAt: exportedAt,
      action: options.action || 'review-and-publish',
      emailTo: adminEmail
    };
    if (Array.isArray(topicCopy.mediaTokens)) {
      topicCopy.mediaTokens = topicCopy.mediaTokens.map((token, index) => ({
        ...token,
        url: packagedMedia[index] || token.url,
        packagedUrl: packagedMedia[index] || '',
        originalUrl: token.url || ''
      }));
    }
    topicCopy.exportMeta = {
      exportedAt,
      packageType,
      status: packageStatus,
      adminReview: true,
      originalId: topic.id,
      recommendedAssetFolder: `assets/${topicSlug}/`
    };

    packagedTopics.push(topicCopy);
  }

  files.push({
    path: 'manifest.json',
    data: JSON.stringify(manifest, null, 2)
  });
  files.push({
    path: 'data/custom-topics.json',
    data: JSON.stringify(packagedTopics, null, 2)
  });
  files.push({
    path: 'data/custom-topics.js',
    data: `export const CUSTOM_TOPICS = ${JSON.stringify(packagedTopics, null, 2)};\n`
  });
  files.push({
    path: 'data/localStorage-euroearth_custom_points.json',
    data: JSON.stringify(topics, null, 2)
  });
  files.push({
    path: 'README.md',
    data: buildReadme(manifest)
  });

  return {
    blob: createStoredZip(files),
    manifest,
    files
  };
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function getAdminTopicExportSummary() {
  const topics = readCustomTopics();
  const mediaCount = topics.reduce((sum, topic) => {
    return sum + getTopicMediaRefs(topic).filter(hasMediaReference).length;
  }, 0);
  return { topicCount: topics.length, mediaCount };
}

export async function downloadAdminTopicPackage() {
  const topics = readCustomTopics();
  const packageResult = await buildTopicPackage(topics);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `topic-earth-admin-review-package-${stamp}.zip`;
  downloadBlob(packageResult.blob, filename);

  return {
    filename,
    topicCount: topics.length,
    mediaCount: packageResult.manifest.assets.length,
    packagedMediaCount: packageResult.manifest.assets.filter((asset) => asset.packaged).length,
    warnings: packageResult.manifest.warnings
  };
}

export async function downloadTopicAdminSubmission(topic) {
  if (!topic || typeof topic !== 'object') {
    throw new Error('No topic was provided for ZIP submission.');
  }

  const topicCopy = cloneJson(topic);
  const packageResult = await buildTopicPackage([topicCopy], {
    packageType: TOPIC_SUBMISSION_PACKAGE_TYPE,
    status: PACKAGE_STATUS,
    source: 'topic-detail-submit',
    adminEmail: ADMIN_SUBMISSION_EMAIL,
    workflowFrom: topicCopy.topicStatus || (topicCopy.isCustom ? 'browser-draft' : 'published-topic'),
    workflowNext: 'admin-review',
    action: 'download-zip-for-admin-review'
  });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `topic-earth-topic-submit-${safeSegment(topicCopy.title, 'topic')}-${stamp}.zip`;
  downloadBlob(packageResult.blob, filename);

  return {
    filename,
    topicCount: 1,
    topicTitle: topicCopy.title || 'Untitled topic',
    adminEmail: ADMIN_SUBMISSION_EMAIL,
    exportedAt: packageResult.manifest.exportedAt,
    mediaCount: packageResult.manifest.assets.length,
    packagedMediaCount: packageResult.manifest.assets.filter((asset) => asset.packaged).length,
    warnings: packageResult.manifest.warnings
  };
}
