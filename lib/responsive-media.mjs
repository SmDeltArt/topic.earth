// Cloud-hosted topic art, with repository assets available when the CDN fails.
export function renderResponsiveMediaImage(token, imageClass, alt, escapeHtml) {
  const escape = value => escapeHtml(String(value || ''));
  const source = token.thumbnailUrl || token.url;
  const mobileSource = token.mobileUrl ? `
    <source media="(max-width: 600px)" srcset="${escape(token.mobileUrl)}"
      data-local-fallback="${escape(token.mobileFallbackUrl || token.fallbackUrl)}">` : '';
  return `
    <div class="media-token-frame${token.mobileUrl ? ' media-responsive-frame' : ''}">
      <picture class="media-responsive-picture">
        ${mobileSource}
        <img src="${escape(source)}" alt="${escape(token.alt || alt)}"
          class="${escape(imageClass)}" loading="lazy" decoding="async"
          data-local-fallback="${escape(token.fallbackUrl)}"
          data-media-url="${escape(token.url)}"
          data-media-source-name="${escape(token.sourceName)}"
          data-media-source-url="${escape(token.sourceUrl)}"
          data-media-watermark="${escape(token.watermarkText)}">
      </picture>
      <div class="media-token-watermark">${escape(token.watermarkText)}</div>
    </div>`;
}

export function installMediaFallbackHandler(container) {
  // Image errors do not bubble: capture also covers dynamically rendered topics.
  container.addEventListener('error', event => {
    const image = event.target;
    if (image?.tagName !== 'IMG' || !image.dataset.localFallback || image.dataset.localFallbackUsed) return;
    image.dataset.localFallbackUsed = 'true';
    const picture = image.closest('picture');
    picture?.querySelectorAll('source').forEach(source => {
      if (source.dataset.localFallback) source.srcset = source.dataset.localFallback;
      else source.remove();
    });
    image.removeAttribute('srcset');
    image.src = image.dataset.localFallback;
  }, true);
}
