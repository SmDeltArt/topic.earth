export class TopicStoryContentManager {
  static normalizePaint(value) {
    if (!value || typeof value !== 'object') return null;
    const hex = value => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : null;
    const alpha = value => value === undefined ? 1 : typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1 ? value : null;
    if (value.kind === 'solid') {
      const color = hex(value.hex), opacity = alpha(value.alpha);
      return color && opacity !== null ? { kind:'solid', hex:color, alpha:opacity } : null;
    }
    if (value.kind !== 'gradient' || !['linear','radial'].includes(value.type) || !Array.isArray(value.stops) || value.stops.length < 2 || value.stops.length > 16) return null;
    const angle = value.angle === undefined ? 0 : value.angle;
    if (typeof angle !== 'number' || !Number.isFinite(angle) || angle < 0 || angle > 360) return null;
    const stops = [];
    for (const stop of value.stops) {
      const color = hex(stop?.hex), opacity = alpha(stop?.alpha);
      if (!color || opacity === null || typeof stop.pos !== 'number' || !Number.isFinite(stop.pos) || stop.pos < 0 || stop.pos > 100) return null;
      stops.push({ hex:color, alpha:opacity, pos:stop.pos });
    }
    return { kind:'gradient', type:value.type, angle, stops:stops.sort((a,b) => a.pos - b.pos) };
  }

  static paintFromPicker(payload) {
    if (!payload || typeof payload !== 'object') return null;
    if (payload.gradientActive === true) {
      const gradient = payload.gradientData;
      return this.normalizePaint({ kind:'gradient', type:gradient?.type, angle:gradient?.angle, stops:Array.isArray(gradient?.stops) ? gradient.stops.map(stop => ({ hex:stop.hex, alpha:stop.a, pos:stop.pos })) : null });
    }
    return this.normalizePaint({ kind:'solid', hex:payload.hex, alpha:payload.rgba?.a });
  }

  static paintCss(value) {
    const paint = this.normalizePaint(value);
    if (!paint) return '';
    const color = item => item.alpha === 1 ? item.hex : `rgba(${parseInt(item.hex.slice(1,3),16)},${parseInt(item.hex.slice(3,5),16)},${parseInt(item.hex.slice(5,7),16)},${item.alpha})`;
    if (paint.kind === 'solid') return color(paint);
    const stops = paint.stops.map(stop => `${color(stop)} ${stop.pos}%`).join(', ');
    return paint.type === 'radial' ? `radial-gradient(circle, ${stops})` : `linear-gradient(${paint.angle}deg, ${stops})`;
  }

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
      appearance: ['light', 'dark'].includes(value.appearance) ? value.appearance : 'preserve',
      backgroundPaint: this.normalizePaint(value.backgroundPaint),
      panelPaint: this.normalizePaint(value.panelPaint),
      titlePaint: this.normalizePaint(value.titlePaint),
      textPaint: this.normalizePaint(value.textPaint)?.kind === 'solid' ? this.normalizePaint(value.textPaint) : null,
      linkPaint: this.normalizePaint(value.linkPaint)?.kind === 'solid' ? this.normalizePaint(value.linkPaint) : null,
      indent: number('indent', 0, 0, 4),
      headingNumbering: value.headingNumbering === 'decimal' ? 'decimal' : 'none',
      listStyle: ['disc','decimal','lower-alpha','square'].includes(value.listStyle) ? value.listStyle : 'preserve'
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
    const background = this.paintCss(s.backgroundPaint), panel = this.paintCss(s.panelPaint);
    if (background) css.push(`body, .topic-content-root > article, body > article, body > .doc-container, body > .content-wrapper, .topic-content-root > .doc-container, .topic-content-root > .content-wrapper { background:${background} !important; --bg:${background} !important; }`);
    if (panel) css.push(`section, .card, .panel, .notice, .smart-panel, .doc-content, .smart-card { background:${panel} !important; } :root, article { --panel:${panel} !important; }`);
    const title = this.paintCss(s.titlePaint), text = this.paintCss(s.textPaint), link = this.paintCss(s.linkPaint);
    if (title) css.push(s.titlePaint.kind === 'gradient'
      ? `h1,h2,h3,h4 { background:${title} !important; background-clip:text !important; -webkit-background-clip:text !important; color:transparent !important; }`
      : `h1,h2,h3,h4 { background-image:none !important; color:${title} !important; -webkit-text-fill-color:${title} !important; }`);
    if (text) css.push(`body, p, li, td, th, blockquote, figcaption { color:${text} !important; --text-primary:${text} !important; }`);
    if (link) css.push(`a { color:${link} !important; }`);
    if (s.indent) css.push(`p { text-indent:${s.indent}em !important; }`);
    if (s.listStyle !== 'preserve') css.push(`ul, ol { list-style-type:${s.listStyle} !important; padding-inline-start:2em !important; }`);
    if (s.headingNumbering === 'decimal') css.push(`body { counter-reset:story-section; } h2:not(.no-numbering) { counter-increment:story-section; counter-reset:story-subsection; } h2:not(.no-numbering)::before { content:counter(story-section) ". "; } h3:not(.no-numbering) { counter-increment:story-subsection; } h3:not(.no-numbering)::before { content:counter(story-section) "." counter(story-subsection) " "; }`);
    if (s.mobileOptimized) css.push(`@media(max-width:620px) { body { padding:${Math.min(s.margin, 10)}px !important; font-size:${s.fontSize}px; line-height:${s.lineHeight}; } .topic-content-root { min-width:0; overflow-wrap:anywhere; } .topic-content-root > article, .topic-content-root .topic-story-card { padding:12px !important; margin-inline:0 !important; } .topic-content-root h1 { font-size:clamp(24px,6vw,32px) !important; line-height:1.2 !important; margin-block:12px !important; } .topic-content-root h2 { font-size:22px !important; line-height:1.3 !important; margin-block:20px 10px !important; } .topic-content-root :is(p,li) { font-size:${s.fontSize}px !important; line-height:${s.lineHeight} !important; } .topic-content-root :is(img,svg,video) { max-width:100%; height:auto; } .topic-content-root :is(pre,table) { max-width:100%; overflow-x:auto; } }`);
    return css.join('\n');
  }

  static parse(html = '') {
    const source = /<!doctype|<html[\s>]/i.test(html) ? html : `<!doctype html><html><head></head><body>${html}</body></html>`;
    return new DOMParser().parseFromString(source, 'text/html');
  }

  static serialize(doc, original = '') {
    const result = /<!doctype|<html[\s>]/i.test(original) ? '<!doctype html>\n' + doc.documentElement.outerHTML : Array.from(doc.head.querySelectorAll('style')).map(node=>node.outerHTML).join('\n') + doc.body.innerHTML;
    const styles = [...String(original).matchAll(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi)].map(match=>match[0]);
    let index = 0;
    return result.replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi,()=>styles[index++] || '');
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
