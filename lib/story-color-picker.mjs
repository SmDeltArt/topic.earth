import { TopicStoryContentManager } from './topic-story-content.mjs';

// The picker supplies all visible chrome. The host only positions its iframe
// and consumes its existing colour, size, drag and close messages.
export class StoryColorPickerManager {
  constructor() {
    this.url = new URL('../assets/widgets/color/smart-color-picker.html?embed=overlay', import.meta.url);
    this.dialog = null;
  }

  open({ paint = null, defaultColor = '#071019', labels = {}, onApply = () => {}, onPreview = () => {}, onCancel = () => {}, solidOnly = false } = {}) {
    this.close();
    const frame = document.createElement('iframe');
    frame.className = 'story-color-picker-frame';
    frame.title = labels.title || 'Smart Color Picker';
    frame.referrerPolicy = 'no-referrer';
    const initial = TopicStoryContentManager.normalizePaint(paint);
    let candidate = initial, changed = false, ready = false, dragging = false;
    let requestedWidth = 304, requestedHeight = 740;
    let left = Math.max(8, window.innerWidth - requestedWidth - 12), top = 12;
    const origin = this.url.origin;
    const send = (action, data) => frame.contentWindow.postMessage({ type:'smart-widget', action, data }, origin);
    const position = () => {
      const vw = window.innerWidth, vh = window.innerHeight;
      const width = Math.min(requestedWidth, Math.max(1,vw - 16));
      const height = Math.min(requestedHeight, Math.max(1,vh - 16), vw <= 620 ? vh * .58 : vh);
      left = Math.max(8,Math.min(left,vw - width - 8));
      top = Math.max(8,Math.min(top,vh - height - 8));
      Object.assign(frame.style,{width:width+'px',height:height+'px',left:left+'px',top:top+'px'});
    };
    const receivePaint = data => {
      const next = TopicStoryContentManager.paintFromPicker(data);
      if (!next || (solidOnly && next.kind !== 'solid')) return false;
      candidate = next; changed = true; onPreview(next); return true;
    };
    const listener = event => {
      if (!ready || event.source !== frame.contentWindow || event.origin !== origin || event.data?.type !== 'smart-widget') return;
      const {action,data} = event.data;
      if (action === 'scp:color' || action === 'scp:validate') receivePaint(data);
      if (action === 'scp:size' && Number.isFinite(data?.width) && Number.isFinite(data?.height) && data.width > 0 && data.height > 0) {
        requestedWidth = Math.min(1000,data.width + 8); requestedHeight = Math.min(4000,data.height + 8); position();
      }
      if (action === 'scp:dragStart') dragging = true;
      if (action === 'scp:dragDelta' && dragging && Number.isFinite(data?.dx) && Number.isFinite(data?.dy)) { left += data.dx; top += data.dy; position(); }
      if (action === 'scp:dragEnd') dragging = false;
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
    this.resizeListener = position;
    this.finish = cancel => { if (cancel) onCancel(); else if (changed && candidate) onApply(candidate); };
    window.addEventListener('message',listener);
    window.addEventListener('resize',position);
    (document.getElementById('topic-content-settings-dialog') || document.body).append(frame);
    position(); frame.src = this.url.href;
  }

  close({ cancel = false } = {}) {
    if (!this.dialog) return;
    const frame = this.dialog, finish = this.finish;
    this.dialog = null; this.finish = null;
    window.removeEventListener('message',this.listener);
    window.removeEventListener('resize',this.resizeListener);
    frame.remove(); this.listener = null; this.resizeListener = null;
    finish?.(cancel);
  }
}
