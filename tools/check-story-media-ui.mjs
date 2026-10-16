import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const source = (await readFile(new URL('../components/DetailPanel.js', import.meta.url), 'utf8'))
  .replace(/^import[\s\S]*?;\r?\n/gm, '').replace('export class DetailPanel', 'class DetailPanel');

// Exercise the actual link sanitizer with HTTP, relative, TOC and unsafe protocols.
const link = attrs => ({
  values: new Map(Object.entries(attrs)),
  get attributes() { return [...this.values].map(([name, value]) => ({ name, value })); },
  getAttribute(name) { return this.values.get(name) ?? null; },
  setAttribute(name, value) { this.values.set(name, value); },
  removeAttribute(name) { this.values.delete(name); }
});
const links = [
  link({ href: 'https://science.nasa.gov/', target: '_top', onclick: 'bad()' }),
  link({ href: '/docs/ambassadors/europe.html', ping: 'https://tracking.invalid', download: 'x' }),
  link({ href: '#section' }), link({ href: 'javascript:alert(1)' }),
  link({ href: 'data:text/html,<script>bad()</script>' }), link({ href: 'mailto:info@topic.earth' })
];
const storyDoc = { querySelectorAll(selector) { return ['*', 'a, area'].includes(selector) ? links : []; },
  head: { querySelectorAll: () => [] }, body: { innerHTML: '<article>Fixture</article>' } };
const listeners = new Map(); let backs = 0;
const context = vm.createContext({ console, URL,
  window: { location: { href: 'https://www.topic.earth/', origin: 'https://www.topic.earth' },
    history: { state: null, pushState(value) { this.state = value; }, back() { backs++; } },
    addEventListener: (type, fn) => listeners.set(type, fn), removeEventListener: type => listeners.delete(type) },
  TopicStoryContentManager: { parse: () => storyDoc }
});
vm.runInContext(`${source}\nthis.Panel = DetailPanel;`, context);
const panel = Object.create(context.Panel.prototype);
assert.equal(panel.sanitizeStoryHtml('<article>Fixture</article>'), '<article>Fixture</article>');
for (const index of [0,1,5]) {
  assert.equal(links[index].getAttribute('target'), '_blank');
  assert.equal(links[index].getAttribute('rel'), 'noopener noreferrer');
}
assert.equal(links[0].getAttribute('onclick'), null);
assert.equal(links[1].getAttribute('href'), 'https://www.topic.earth/docs/ambassadors/europe.html');
assert.equal(links[1].getAttribute('ping'), null);
assert.equal(links[1].getAttribute('download'), null);
assert.equal(links[2].getAttribute('target'), '_self');
for (const index of [3,4]) assert.equal(links[index].getAttribute('href'), null);
const storyFrames = [...source.matchAll(/<iframe[^>]*sandbox="([^"]*)"/g)];
assert.equal(storyFrames.length, 3);
for (const [,sandbox] of storyFrames) {
  assert.ok(sandbox.includes('allow-popups-to-escape-sandbox'));
  assert.ok(!sandbox.includes('allow-scripts') && !sandbox.includes('allow-same-origin'));
}

// Model DOM moves so Full view must restore the same iframe to its panel.
class Element {
  constructor(tag) { this.tag = tag; this.children = []; this.handlers = new Map(); }
  get isConnected() { return this === body || Boolean(this.parent?.isConnected); }
  detach() { if (this.parent) this.parent.children.splice(this.parent.children.indexOf(this), 1); this.parent = null; }
  append(...nodes) { for (const node of nodes) { node.detach(); this.children.push(node); node.parent = this; } }
  before(node) { const parent = this.parent; node.detach(); parent.children.splice(parent.children.indexOf(this), 0, node); node.parent = parent; }
  replaceWith(node) { this.before(node); this.detach(); }
  remove() { this.detach(); }
  setAttribute() {}
  addEventListener(type, fn) { this.handlers.set(type, fn); }
  showModal() { this.open = true; }
  close() { this.open = false; }
}
const body = new Element('body'); const holder = new Element('div'); const frame = new Element('iframe');
frame.title = 'NASA interactive'; body.append(holder); holder.append(frame);
const button = { closest: () => ({ querySelector: () => frame }), focus() {} };
context.document = { body, createElement: tag => new Element(tag) };
panel.openTopicEmbedViewer(button);
assert.equal(panel.topicEmbedViewer.dialog.open, true);
assert.equal(frame.parent, panel.topicEmbedViewer.dialog);
panel.closeTopicEmbedViewer();
assert.equal(frame.parent, holder); assert.equal(backs, 1); assert.equal(listeners.size, 0);
panel.openTopicEmbedViewer(button);
listeners.get('popstate')();
assert.equal(frame.parent, holder); assert.equal(backs, 1, 'Browser Back must not cause a second Back');
panel.normalizeMediaToken = value => value;
panel.renderMediaTokenImage = () => '<iframe title="NASA"></iframe>';
const markup = panel.renderTopicMediaItem({ mediaType: 'iframe' });
assert.ok(markup.includes('topic-media-item-embed') && markup.includes('full-topic-embed'));
console.log('Story links open separately with safe protocols and script isolation; iframe full view restores its panel and supports Back.');
