export function getHostFromUrl(url = '') {
  const value = String(url || '').trim();
  if (!value) return '';

  try {
    const parsed = new URL(value, 'http://topic-earth.local/');
    return parsed.hostname === 'topic-earth.local'
      ? ''
      : parsed.hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

export function getDirectImageUrl(url = '') {
  const value = String(url || '').trim();
  if (!value) return '';
  if (/^(?:data|blob):image\//i.test(value)) return value;
  return /\.(png|jpe?g|webp|gif|avif|svg)(?:[?#].*)?$/i.test(value) ? value : '';
}

export function getDirectVideoUrl(url = '') {
  const value = String(url || '').trim();
  try {
    const parsed = new URL(value);
    return /^https?:$/.test(parsed.protocol) && /\.(mp4|webm|ogv|ogg|mov)$/i.test(parsed.pathname) ? value : '';
  } catch { return ''; }
}

export function createMediaToken(input = {}) {
  const sourceUrl = String(input.sourceUrl || '').trim();
  const sourceHost = input.sourceHost || getHostFromUrl(sourceUrl);
  const sourceName = input.sourceName || sourceHost || 'Media source';
  const watermarkText = input.watermarkText || `${sourceHost || sourceName} | topic.earth research`;

  return {
    id: input.id || `media_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    url: String(input.url || '').trim(),
    mobileUrl: String(input.mobileUrl || '').trim(),
    fallbackUrl: String(input.fallbackUrl || '').trim(),
    mobileFallbackUrl: String(input.mobileFallbackUrl || '').trim(),
    alt: String(input.alt || '').trim(),
    sourceUrl,
    sourceName,
    sourceHost,
    watermarkText,
    query: input.query || '',
    generated: Boolean(input.generated),
    provider: input.provider || '',
    mediaType: input.mediaType || (getDirectVideoUrl(input.url) ? 'video' : ''),
    embedUrl: String(input.embedUrl || '').trim(),
    thumbnailUrl: String(input.thumbnailUrl || '').trim(),
    videoId: String(input.videoId || '').trim(),
    videoLanguage: String(input.videoLanguage || '').trim(),
    width: Math.max(0, Number(input.width) || 0),
    height: Math.max(0, Number(input.height) || 0),
    portrait: Boolean(input.portrait || (Number(input.height) > Number(input.width) && Number(input.width) > 0) || /youtube\.com\/shorts\//i.test(sourceUrl)),
    autoplay: input.autoplay !== false,
    loop: Boolean(input.loop),
    authorName: String(input.authorName || '').trim(),
    createdAt: input.createdAt || new Date().toISOString(),
    browserAssetKey: input.browserAssetKey || '',
    browserAssetMime: input.browserAssetMime || '',
    storage: input.storage || '',
    browserOnly: Boolean(input.browserOnly)
  };
}

export function normalizeMediaToken(input) {
  if (!input) return null;

  if (typeof input === 'string') {
    const url = String(input || '').trim();
    if (!url) return null;
    return createMediaToken({
      url,
      sourceName: getHostFromUrl(url) || 'Legacy media',
      sourceUrl: getDirectImageUrl(url) ? url : ''
    });
  }

  const token = createMediaToken(input);
  return token.url || token.browserAssetKey || token.sourceUrl ? token : null;
}

export function getMediaTokensForPoint(point = {}) {
  if (Array.isArray(point.mediaTokens) && point.mediaTokens.length > 0) {
    return point.mediaTokens.map(token => normalizeMediaToken(token)).filter(Boolean);
  }

  return (Array.isArray(point.media) ? point.media : [])
    .map(token => normalizeMediaToken(token))
    .filter(Boolean);
}

export function getTopicPreviewMediaToken(point = {}) {
  const tokens = getMediaTokensForPoint(point);
  return tokens.find(token => token?.url) || null;
}

export function getTopicPreviewMediaUrl(point = {}) {
  return getTopicPreviewMediaToken(point)?.url || '';
}
