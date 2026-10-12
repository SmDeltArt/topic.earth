export class TopicStoryContentManager {
  static normalizeSettings(value = {}) {
    value = value && typeof value === 'object' ? value : {};
    const number = (key, fallback, min, max) => {
      const n = Number(value[key]);
      return value[key] === undefined || !Number.isFinite(n) ? fallback : Math.min(max, Math.max(min, n));
    };
    return {
      fontSize: number('fontSize', 17, 14, 24),
      margin: number('margin', 12, 0, 40),
      lineHeight: number('lineHeight', 1.65, 1.3, 2.2),
      width: number('width', 900, 320, 1200),
      mobileOptimized: value.mobileOptimized !== false,
      appearance: ['light', 'dark'].includes(value.appearance) ? value.appearance : 'preserve'
    };
  }

  static contentCss(settings = {}, { explicit = false } = {}) {
    const s = this.normalizeSettings(settings);
    const css = [];
    if (explicit) {
      css.push(`body { font-size:${s.fontSize}px; line-height:${s.lineHeight}; padding:${s.margin}px; } .topic-content-root { max-width:${s.width}px; margin-inline:auto; } .topic-content-root :is(p,li,td,blockquote) { font-size:${s.fontSize}px !important; line-height:${s.lineHeight} !important; }`);
      if (s.appearance !== 'preserve') {
        const light = s.appearance === 'light';
        css.push(`:root { color-scheme:${s.appearance}; --bg:${light ? '#ffffff' : '#071019'}; --panel:${light ? '#f1f5f9' : '#141824'}; --text-primary:${light ? '#172032' : '#e8eaed'}; --text-secondary:${light ? '#475569' : '#c1cdd0'}; } body { background:var(--bg); color:var(--text-primary); }`);
      }
    }
    if (s.mobileOptimized) css.push(`@media(max-width:620px) { body { padding:${Math.min(s.margin, 10)}px !important; font-size:${s.fontSize}px; line-height:${s.lineHeight}; } .topic-content-root { min-width:0; overflow-wrap:anywhere; } .topic-content-root > article, .topic-content-root .topic-story-card { padding:12px !important; margin-inline:0 !important; } .topic-content-root h1 { font-size:clamp(24px,6vw,32px) !important; line-height:1.2 !important; margin-block:12px !important; } .topic-content-root h2 { font-size:22px !important; line-height:1.3 !important; margin-block:20px 10px !important; } .topic-content-root :is(p,li) { font-size:${s.fontSize}px !important; line-height:${s.lineHeight} !important; } .topic-content-root :is(img,svg,video) { max-width:100%; height:auto; } .topic-content-root :is(pre,table) { max-width:100%; overflow-x:auto; } }`);
    return css.join('\n');
  }

  static parse(html = '') {
    return new DOMParser().parseFromString(html, 'text/html');
  }

  static textNodes(doc) {
    return Array.from(doc.body.querySelectorAll('h1,h2,h3,h4,p,li,figcaption,td,th,blockquote,dt,dd'))
      .filter(node => !node.children.length && node.textContent.trim());
  }

  static editableBlocks(html = '') {
    return this.textNodes(this.parse(html)).map((node, index) => ({ index, tag: node.tagName.toLowerCase(), text: node.textContent }));
  }

  static applyTextUpdates(html, updates) {
    if (!Array.isArray(updates) || !updates.length) throw new Error('The AI returned no text updates. Existing HTML was kept.');
    const doc = this.parse(html);
    const nodes = this.textNodes(doc);
    const seen = new Set();
    for (const update of updates) {
      if (!Number.isInteger(update.index) || !nodes[update.index] || seen.has(update.index) || typeof update.text !== 'string' || update.text.length > 12000) throw new Error('Invalid text update. Existing HTML was kept.');
      seen.add(update.index);
      nodes[update.index].textContent = update.text;
    }
    const result = /<!doctype|<html[\s>]/i.test(html) ? '<!doctype html>\n' + doc.documentElement.outerHTML : Array.from(doc.head.querySelectorAll('style')).map(node => node.outerHTML).join('\n') + doc.body.innerHTML;
    // Preserve author-supplied stylesheet bytes, including whitespace and comments.
    const originalStyles = [...String(html).matchAll(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi)].map(match => match[0]);
    let styleIndex = 0;
    return result.replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, () => originalStyles[styleIndex++] || '');
  }

  static applySettings(html, settings) {
    const css = this.contentCss(settings, { explicit: true });
    const withoutPrevious = String(html).replace(/<style\b[^>]*\bid=["']topic-content-settings["'][^>]*>[\s\S]*?<\/style\s*>/gi, '');
    const tag = `<style id="topic-content-settings">${css}</style>`;
    return /<\/body\s*>/i.test(withoutPrevious) ? withoutPrevious.replace(/<\/body\s*>/i, tag + '\n</body>') : withoutPrevious + '\n' + tag;
  }
}
