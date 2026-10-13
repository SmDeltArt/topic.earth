import { TopicStoryContentManager as Content } from './topic-story-content.mjs?v=story-media-20261013';

const EXTENSIONS = {svg:'image',png:'image',jpg:'image',jpeg:'image',webp:'image',gif:'image',avif:'image',webm:'video',mp4:'video',mp3:'audio',wav:'audio'};
export class TopicStoryMedia {
  static safeSource(value, { data = false } = {}) {
    const source = String(value || '').trim();
    if (!source || /[\u0000-\u0020<>"'\\]/.test(source)) return '';
    if (data && /^data:(?:image\/(?:png|jpeg|webp|gif|avif|svg\+xml)|video\/(?:webm|mp4)|audio\/(?:mpeg|wav));base64,[A-Za-z0-9+/=]+$/.test(source)) return source;
    if (/^https?:\/\//i.test(source)) {
      try { const url = new URL(source); return url.username || url.password ? '' : source; } catch { return ''; }
    }
    if (/^(?:\.\/)?assets\/[\w./-]+$/.test(source) && !source.split('/').includes('..')) return source.replace(/^\.\//,'');
    if (/^\/(?!\/)[\w./-]+$/.test(source) && !source.split('/').includes('..')) return source;
    return '';
  }
  static normalize(value = {}) {
    const src = this.safeSource(value.src);
    if (!src) throw new Error('Use an HTTP(S) media URL or an assets/ file.');
    const extension = src.split(/[?#]/)[0].split('.').pop().toLowerCase();
    const inferred = EXTENSIONS[extension];
    const kind = ['image','video','audio'].includes(value.kind) ? value.kind : inferred;
    if (!kind || (inferred && kind !== inferred && !(extension === 'webm' && kind === 'audio'))) throw new Error('Choose image, video or audio for this source.');
    const width = value.width === undefined ? 100 : Number(value.width);
    const afterParagraph = value.afterParagraph === undefined ? 0 : Number(value.afterParagraph);
    if (!Number.isFinite(width) || width < 10 || width > 100 || !Number.isInteger(afterParagraph) || afterParagraph < 0) throw new Error('Invalid media width or paragraph position.');
    return {src,kind,width,afterParagraph,align:['left','center','right'].includes(value.align) ? value.align : 'center',
      caption:String(value.caption || '').slice(0,1000),alt:String(value.alt || value.caption || '').slice(0,1000),
      autoplay:value.autoplay === true,loop:value.loop === true,controls:value.controls !== false};
  }
  static nodes(doc) { return Array.from(doc.body.querySelectorAll('img,video,audio')).filter(node => !node.closest('svg')); }
  static list(html) {
    return this.nodes(Content.parse(html)).map((node,index) => ({ index,src:node.getAttribute('src') || node.querySelector('source')?.getAttribute('src') || '',
      kind:node.tagName.toLowerCase() === 'img' ? 'image' : node.tagName.toLowerCase(),width:parseFloat(node.closest('[data-story-media]')?.style.width) || 100,
      align:node.closest('[data-story-media]')?.dataset.align || 'center',caption:node.closest('figure')?.querySelector('figcaption')?.textContent || '',
      alt:node.getAttribute('alt') || '',autoplay:node.hasAttribute('autoplay'),loop:node.hasAttribute('loop'),controls:node.hasAttribute('controls') }));
  }
  static figure(doc, value) {
    const spec = this.normalize(value), figure = doc.createElement('figure');
    figure.dataset.storyMedia = ''; figure.dataset.align = spec.align;
    figure.style.cssText = `width:${spec.width}%;max-width:100%;margin:16px ${spec.align === 'left' ? 'auto 16px 0' : spec.align === 'right' ? '0 16px auto' : 'auto'};`;
    const node = doc.createElement(spec.kind === 'image' ? 'img' : spec.kind);
    node.setAttribute('src',spec.src); node.style.cssText = 'display:block;width:100%;max-width:100%;height:auto;';
    if (spec.kind === 'image') { node.setAttribute('alt',spec.alt); node.setAttribute('loading','lazy'); }
    else {
      node.setAttribute('preload','metadata');
      if (spec.controls || !spec.autoplay) node.setAttribute('controls','');
      if (spec.loop) node.setAttribute('loop','');
      if (spec.autoplay) { node.setAttribute('autoplay',''); node.setAttribute('muted',''); }
      if (spec.kind === 'video') node.setAttribute('playsinline','');
    }
    figure.appendChild(node);
    if (spec.caption) { const caption = doc.createElement('figcaption'); caption.textContent = spec.caption; figure.appendChild(caption); }
    return figure;
  }
  static insertions(html, operations, { allowedSources = null } = {}) {
    if (!Array.isArray(operations) || operations.length > 20) throw new Error('Invalid media instructions.');
    const doc = Content.parse(html), paragraphs = Array.from(doc.body.querySelectorAll('p'));
    const tails = new Map();
    for (const value of operations) {
      const spec = this.normalize(value);
      if (allowedSources && !allowedSources.has(spec.src)) throw new Error('AI may only use media URLs supplied in your request or imported assets.');
      if (spec.afterParagraph > paragraphs.length) throw new Error(`Paragraph ${spec.afterParagraph} does not exist.`);
      const figure = this.figure(doc,spec);
      if (spec.afterParagraph === 0) (doc.body.querySelector('article') || doc.body).appendChild(figure);
      else { const anchor = tails.get(spec.afterParagraph) || paragraphs[spec.afterParagraph-1]; anchor.after(figure); tails.set(spec.afterParagraph,figure); }
    }
    return Content.serialize(doc,html);
  }
  static modify(html, index, value = null) {
    const doc = Content.parse(html), node = this.nodes(doc)[index];
    if (!node) throw new Error('Media no longer exists.');
    const target = node.closest('[data-story-media]') || (node.closest('figure')?.querySelectorAll('img,video,audio').length === 1 ? node.closest('figure') : node);
    if (value) target.replaceWith(this.figure(doc,value)); else target.remove();
    return Content.serialize(doc,html);
  }
  static resolve(html, assets = [], resolver = null) {
    const doc = Content.parse(html);
    for (const node of doc.body.querySelectorAll('img,video,audio,source')) {
      for (const attr of ['src','poster']) {
        const path = node.getAttribute(attr); if (!path) continue;
        const asset = assets.find(item => item.path === path.replace(/^\.\//,''));
        const resolved = resolver ? resolver(path,asset) : asset?.url;
        if (resolved && this.safeSource(resolved,{data:true})) node.setAttribute(attr,resolved);
        else if (!this.safeSource(path,{data:true})) node.removeAttribute(attr);
      }
      // Responsive sources cannot bypass asset resolution or URL validation.
      node.removeAttribute('srcset');
    }
    return Content.serialize(doc,html);
  }
  static translationNodes(doc) {
    const nodes = [];
    const walk = node => {
      if (node.nodeType === 3 && node.textContent.trim()) nodes.push(node);
      else if (node.nodeType !== 3 && !['STYLE','SCRIPT','NOSCRIPT','TEMPLATE','CODE','PRE'].includes(node.tagName)) Array.from(node.childNodes || []).forEach(walk);
    };
    walk(doc.body); return nodes;
  }
  static readingText(html) { return this.translationNodes(Content.parse(html)).map(node=>node.textContent.trim()).join('\n\n'); }
  static async translate(html, language, translateText, { isActive = () => true, onProgress = () => {} } = {}) {
    const doc = Content.parse(html), nodes = this.translationNodes(doc);
    if (nodes.length > 250 || nodes.reduce((n,node)=>n+node.textContent.length,0) > 50000) throw new Error('Story exceeds 250 text fragments or 50,000 characters. Translate a shorter document.');
    const cache = new Map(); let done = 0, untranslated = 0, translated = 0;
    for (const node of nodes) {
      if (!isActive()) throw new Error('Translation cancelled.');
      const text = node.textContent.trim();
      if (!/\p{L}/u.test(text) || /^https?:\/\/\S+$/.test(text)) { onProgress(++done,nodes.length); continue; }
      let result = cache.get(text);
      if (!result) { result = await translateText(text); cache.set(text,result); }
      if (!result || typeof result.text !== 'string') throw new Error('Invalid translation. Original HTML kept.');
      if (result.provider === 'original') { untranslated++; onProgress(++done,nodes.length); continue; }
      translated++;
      node.textContent = node.textContent.replace(text, () => result.text);
      onProgress(++done,nodes.length);
    }
    if (!translated && untranslated) throw new Error('Translation unavailable. Original HTML kept.');
    doc.documentElement.setAttribute('lang',language);
    return {html:Content.serialize(doc,html),text:this.translationNodes(doc).map(node=>node.textContent.trim()).join('\n\n'),untranslated};
  }
}
