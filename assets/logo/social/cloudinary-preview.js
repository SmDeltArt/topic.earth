// Use exported delivery URLs verbatim. Recorded clips never replace the live app clock.
(async () => {
  const [locale, items, catalog] = await Promise.all([
    window.TopicPreviewLanguage,
    fetch('./formats/manifest.json').then(r => r.json()),
    fetch('./cloudinary-assets.json').then(r => r.json())
  ]);
  const clock = document.getElementById('clock');
  const format = document.getElementById('format');
  const localRoot = '../local/';
  const standard = item => item.favicon ? item.width === 64 : item.width === 512 && item.height === 512;
  function master(item) {
    const design = item.favicon ? 'topic-earth-clock-transparent-512' : item.width === item.height || item.height > item.width ? 'topic-earth-social-logo-512' : 'topic-earth-social-banner-1200x630';
    return localRoot + design + (item.clock === 'automatic' ? '-automatic.svg' : '-animated.svg') + '?lang=' + locale.language;
  }
  function localRaster(item, extension) {
    return standard(item) && ['webp','webm','gif','png'].includes(extension) ? localRoot + item.name + '.' + extension : null;
  }
  function render() {
    const copy = locale.copy;
    const selectedClock = clock.value;
    clock.options[0].textContent = copy.local; clock.options[1].textContent = copy.automatic;
    clock.value = selectedClock;
    for (const id of ['social','favicons','standards']) document.getElementById(id).replaceChildren();
    for (const item of items.filter(i => i.clock === clock.value)) {
      const urls = catalog.assets[item.name]?.urls || {};
      const extension = format.value;
      const fallback = localRaster(item, extension);
      const remote = extension === 'live' ? null : urls[extension];
      const active = extension === 'live' ? master(item) : remote || fallback || master(item);
      const live = extension === 'live' || (!remote && !fallback);
      const card = document.createElement('article'); card.className = item.favicon ? 'favicon' : '';
      card.style.setProperty('--icon-size',Math.min(item.width,256)+'px');
      const title = document.createElement('h2'); title.textContent = `${item.width} × ${item.height}`;
      if (standard(item)) title.textContent += ' · ' + (item.favicon ? copy.standardFavicon : copy.standardLogo);
      const media = document.createElement('div'); media.className = 'media';
      const status = document.createElement('p'); status.className = 'source-status';
      status.textContent = live ? copy.liveMaster : remote ? copy.cloud : copy.fallback;
      if (!remote && !fallback && extension !== 'live') status.textContent = copy.pending + ' · ' + copy.liveMaster;
      const content = document.createElement(live ? 'object' : extension === 'webm' ? 'video' : 'img');
      content.style.aspectRatio = item.width + ' / ' + item.height;
      if (live) { content.type = 'image/svg+xml'; content.data = active; }
      else {
        if (extension === 'webm') {
          content.muted = true; content.autoplay = true; content.loop = true; content.playsInline = true;
          content.controls = !item.favicon;
          content.poster = urls.png || localRaster(item,'png') || '';
        }
        else content.alt = title.textContent;
        content.src = active;
        content.addEventListener('error',() => {
          if (fallback && content.getAttribute('src') !== fallback) {
            content.src = fallback; status.textContent = copy.fallback;
          } else {
            const object = document.createElement('object'); object.type = 'image/svg+xml'; object.data = master(item);
            object.style.aspectRatio = item.width + ' / ' + item.height; media.replaceChildren(object); status.textContent = copy.liveMaster;
          }
        });
      }
      media.append(content);
      const downloads = document.createElement('div'); downloads.className = 'downloads';
      for (const kind of ['webp','webm','gif','png','svg']) {
        const url = urls[kind] || localRaster(item,kind);
        if (!url) continue;
        const link = document.createElement('a'); link.href = url; link.textContent = kind.toUpperCase(); link.target = '_blank'; link.rel = 'noopener'; downloads.append(link);
      }
      const liveLink = document.createElement('a'); liveLink.href = master(item); liveLink.textContent = copy.liveMaster; downloads.append(liveLink);
      card.append(title,media,status,downloads);
      document.getElementById(standard(item) ? 'standards' : item.favicon ? 'favicons' : 'social').append(card);
    }
  }
  clock.addEventListener('change',() => { window.TopicFavicon?.setClockMode(clock.value); render(); });
  format.addEventListener('change',render);
  window.addEventListener('socialLanguageChanged',render);
  render();
})();
