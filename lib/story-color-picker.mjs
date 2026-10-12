import { TopicStoryContentManager } from './topic-story-content.mjs';

export class StoryColorPickerManager {
  constructor() {
    this.url = new URL('../assets/widgets/color/smart-color-picker.html?embed=overlay', import.meta.url);
    this.dialog = null;
  }

  open({ paint = null, defaultColor = '#071019', labels = {}, onApply = () => {}, onPreview = () => {}, onCancel = () => {}, solidOnly = false } = {}) {
    this.close();
    const dialog = document.createElement('dialog');
    dialog.className = 'story-color-picker-dialog';
    dialog.setAttribute('aria-label', labels.title || 'Smart Color Picker');
    const toolbar = document.createElement('div');
    toolbar.className = 'story-color-picker-toolbar';
    const cancel = document.createElement('button');
    cancel.type = 'button'; cancel.textContent = labels.cancel || 'Cancel';
    const apply = document.createElement('button');
    apply.type = 'button'; apply.textContent = labels.apply || 'Use this colour';
    apply.disabled = true;
    const link = document.createElement('a');
    link.href = 'https://github.com/SmDeltArt/color'; link.target = '_blank'; link.rel = 'noopener noreferrer';
    link.textContent = 'SmΔrt Color Picker · GitHub';
    toolbar.append(cancel, apply, link);
    const frame = document.createElement('iframe');
    frame.title = labels.title || 'Smart Color Picker';
    frame.referrerPolicy = 'no-referrer';
    const initial = TopicStoryContentManager.normalizePaint(paint);
    let candidate = initial;
    let ready = false;
    const origin = this.url.origin;
    const send = (action, data) => frame.contentWindow.postMessage({ type: 'smart-widget', action, data }, origin);
    const listener = event => {
      if (!ready || event.source !== frame.contentWindow || event.origin !== origin || event.data?.type !== 'smart-widget') return;
      if (['scp:color', 'scp:validate'].includes(event.data.action)) {
        const next = TopicStoryContentManager.paintFromPicker(event.data.data);
        candidate = solidOnly && next?.kind !== 'solid' ? null : next;
        apply.disabled = !candidate;
        if (candidate) onPreview(candidate);
        apply.title = candidate ? '' : solidOnly ? 'Text and links use solid colours.' : 'Choose a valid colour or a gradient with 2–16 stops.';
      }
      if (event.data.action === 'scp:close') this.close();
    };
    frame.addEventListener('load', () => {
      if (this.dialog !== dialog) return;
      ready = true;
      const style = getComputedStyle(document.getElementById('topic-content-settings-dialog') || document.body);
      send('scp:open', {
        hex: initial?.kind === 'solid' ? initial.hex : initial?.stops?.[0]?.hex || defaultColor,
        alpha: initial?.kind === 'solid' ? initial.alpha : 1,
        theme: style.colorScheme === 'light' ? 'light' : 'dark',
        palette: { bg: style.backgroundColor, surface: style.backgroundColor, panel: style.backgroundColor, text: style.color, border: style.borderColor, accent: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#39ff88' }
      });
      send('scp:setGradient', initial?.kind === 'gradient'
        ? { open: true, type: initial.type, angle: initial.angle, stops: initial.stops.map(stop => ({ hex: stop.hex, a: stop.alpha, pos: stop.pos })) }
        : { open: false });
    });
    cancel.addEventListener('click', () => this.close());
    apply.addEventListener('click', () => { if (!candidate) return; this.cancelCallback = null; onApply(candidate); this.close(); });
    dialog.addEventListener('cancel', event => { event.preventDefault(); this.close(); });
    dialog.append(toolbar, frame);
    this.dialog = dialog;
    this.listener = listener;
    window.addEventListener('message', listener);
    this.cancelCallback = onCancel;
    const host = document.getElementById('topic-content-settings-dialog');
    (host || document.body).append(dialog);
    if (host && dialog.show) dialog.show(); else dialog.showModal();
    frame.src = this.url.href;
  }

  close() {
    if (!this.dialog) return;
    const cancel = this.cancelCallback;
    this.cancelCallback = null;
    cancel?.();
    window.removeEventListener('message', this.listener);
    this.dialog.close();
    this.dialog.remove();
    this.dialog = null;
    this.listener = null;
  }
}
