// Use documented player preferences. Neither provider exposes a guaranteed
// creator-first automatic translation fallback for arbitrary embedded videos.
export function normalizeVideoLanguage(value = '') {
  const code = String(value || '').trim().replace(/_/g, '-').toLowerCase();
  return /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/.test(code) ? code : '';
}

export function buildCaptionEmbedUrl(value, { enabled = true, uiLanguage = 'en', videoLanguage = '' } = {}) {
  if (!enabled) return value;
  let url;
  try { url = new URL(value); } catch { return value; }
  if (url.protocol !== 'https:') return value;
  const host = url.hostname.toLowerCase();
  const youtube = ['www.youtube.com', 'youtube.com', 'www.youtube-nocookie.com', 'youtube-nocookie.com'].includes(host)
    && /^\/embed\/[\w-]+$/.test(url.pathname);
  const vimeo = host === 'player.vimeo.com' && /^\/video\/\d+$/.test(url.pathname);
  if (!youtube && !vimeo) return value;

  const target = normalizeVideoLanguage(uiLanguage) || 'en';
  const original = normalizeVideoLanguage(videoLanguage);
  // Treat regional variants of the spoken language as the same language:
  // request the original caption track rather than a translation.
  const sameLanguage = original && original.split('-')[0] === target.split('-')[0];
  const captionLanguage = sameLanguage ? original : target;
  if (youtube) {
    url.searchParams.set('hl', target);
    url.searchParams.set('cc_load_policy', '1');
    url.searchParams.set('cc_lang_pref', captionLanguage);
  } else {
    url.searchParams.set('texttrack', captionLanguage);
  }
  return url.toString();
}
