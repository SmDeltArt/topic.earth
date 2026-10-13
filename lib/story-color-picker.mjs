import { TopicStoryContentManager } from './topic-story-content.mjs?v=story-media-20261013';

// embed=overlay requires a transparent FULL-VIEWPORT iframe. The picker
// owns panel positioning, dragging, gradient expansion and closing. Never
// shrink this iframe to scp:size or move it using scp:drag messages.
export class StoryColorPickerManager {
  constructor() {
    this.url = new URL('../assets/widgets/color/smart-color-picker.html?embed=overlay&v=story-media-20261013', import.meta.url);
    this.dialog = null;
  }

  open({ paint = null, defaultColor = '#071019', labels = {}, onApply = () => {}, onPreview = () => {}, onCancel = () => {}, solidOnly = false } = {}) {
    this.close();
    const frame = document.createElement('iframe');
    frame.className = 'story-color-picker-frame';
    frame.title = labels.title || 'Smart Color Picker';
    frame.referrerPolicy = 'no-referrer';
    const initial = TopicStoryContentManager.normalizePaint(paint);
    let candidate = initial, changed = false, ready = false;
    const origin = this.url.origin;
    const send = (action, data) => frame.contentWindow.postMessage({ type:'smart-widget', action, data }, origin);
    const receivePaint = data => {
      const next = TopicStoryContentManager.paintFromPicker(data);
      if (!next || (solidOnly && next.kind !== 'solid')) return false;
      candidate = next; changed = true; onPreview(next); return true;
    };
    const listener = event => {
      if (!ready || event.source !== frame.contentWindow || event.origin !== origin || event.data?.type !== 'smart-widget') return;
      const {action,data} = event.data;
      if (action === 'scp:color' || action === 'scp:validate') receivePaint(data);
      if (action === 'scp:close') { receivePaint(data); this.close(); }
    };
    frame.addEventListener('load', () => {
      if (this.dialog !== frame) return;
      ready = true;
      const style = getComputedStyle(document.getElementById('topic-content-settings-dialog') || document.body);
      send('scp:open', {
        hex: initial?.kind === 'solid' ? initial.hex : initial?.stops?.[0]?.hex || defaultColor,
        alpha: initial?.kind === 'solid' ? initial.alpha : 1,
        theme: style.colorScheme === 'light' ? 'light' : 'dark',
        palette: { bg:style.backgroundColor, surface:style.backgroundColor, panel:style.backgroundColor, text:style.color, border:style.borderColor, accent:getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#39ff88' }
      });
      send('scp:setGradient', initial?.kind === 'gradient'
        ? { open:true, type:initial.type, angle:initial.angle, stops:initial.stops.map(stop => ({hex:stop.hex,a:stop.alpha,pos:stop.pos})) }
        : { open:false });
    });
    this.dialog = frame;
    this.listener = listener;
    this.finish = cancel => { if (cancel) onCancel(); else if (changed && candidate) onApply(candidate); };
    window.addEventListener('message',listener);
    // A transparent top-layer surface prevents a transformed/scrolled settings
    // panel from becoming the iframe's containing block. No host chrome.
    const surface = document.createElement('dialog');
    surface.className = 'story-color-picker-surface';
    surface.setAttribute('aria-label', frame.title);
    surface.append(frame); document.body.append(surface);
    surface.addEventListener('cancel', event => { event.preventDefault(); this.close(); });
    this.surface = surface;
    surface.showModal?.();
    frame.src = this.url.href;
  }

  close({ cancel = false } = {}) {
    if (!this.dialog) return;
    const frame = this.dialog, finish = this.finish;
    this.dialog = null; this.finish = null;
    window.removeEventListener('message',this.listener);
    frame.remove(); this.listener = null;
    this.surface?.close?.(); this.surface?.remove(); this.surface = null;
    finish?.(cancel);
  }
}
