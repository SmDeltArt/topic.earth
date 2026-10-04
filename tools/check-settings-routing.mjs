import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

let mode = 'user';
let opened = 0;
const context = vm.createContext({
  navigator: { onLine: true },
  Settings: { API_SETTINGS_WIDGET_URLS: { ADMIN: 'https://api.caddeltai.com/api-settings' } },
  AppAccess: {
    isAdminMode: () => mode === 'admin',
    can: () => true,
    setMode: value => { mode = value; return { mode, isAdminMode: mode === 'admin' }; }
  },
  CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } },
  window: { dispatchEvent() {} }
});
const source = (await readFile(new URL('../components/DetailPanel.js', import.meta.url), 'utf8'))
  .replace(/^import[\s\S]*?;\r?\n/gm, '')
  .replace('export class DetailPanel', 'class DetailPanel');
vm.runInContext(`${source}\nglobalThis.Panel = DetailPanel;`, context);
const panel = Object.create(context.Panel.prototype);
panel.openApiSettingsWindow = () => { opened++; };
assert.equal(panel.getApiSettingsWidgetUrl(), './ollama-install-guide.html');
panel.setSettingsAccessMode('admin', null);
assert.equal(opened, 0, 'Selecting Admin must not launch API Settings');
assert.equal(panel.getApiSettingsWidgetUrl(), 'https://api.caddeltai.com/api-settings');
context.navigator.onLine = false;
assert.equal(panel.getApiSettingsWidgetUrl(), './ollama-install-guide.html');
panel.setSettingsAccessMode('user', null);
assert.equal(opened, 0);
panel.container = { scrollTop: 480 };
panel.renderSettings = () => { panel.container.scrollTop = 0; };
panel.unlockSettingsAccess();
assert.equal(panel.settingsAccessExpanded, true);
assert.equal(panel.container.scrollTop, 480);
panel.unlockSettingsAccess();
assert.equal(panel.settingsAccessExpanded, false);
assert.equal(mode, 'user', 'Collapsing access choices must preserve the selected mode');
console.log('User, online Admin, offline Admin and explicit API launch checks passed.');

// Exercise the actual delegated Settings click handler with repeated redraws.
const start = source.indexOf("    content.addEventListener('click', (e) => {", source.indexOf('  renderSettings() {'));
const end = source.indexOf('    }, settingsEventOptions);', start) + '    }, settingsEventOptions);'.length;
context.AbortController = AbortController;
context.content = new EventTarget();
context.testPanel = { getAdminOnlyActionMessage: () => '', unlockSettingsAccess: () => { opened++; } };
const setupStart = source.indexOf('    this.settingsEvents?.abort();');
const setupEnd = source.indexOf('    const settings = Settings.get();', setupStart);
vm.runInContext(`globalThis.redraw = function() { const content = globalThis.content; ${source.slice(setupStart, setupEnd)} ${source.slice(start, end)} };`, context);
for (let i = 0; i < 10; i++) context.redraw.call(context.testPanel);
context.content.closest = () => ({ dataset: { action: 'unlock-settings-access' } });
const beforeClicks = opened;
context.content.dispatchEvent(new Event('click'));
assert.equal(opened - beforeClicks, 1, 'Ten redraws must still produce only one action per click');
console.log('Repeated Settings redraws retain exactly one click handler.');

let unlockCount = 0;
context.AppAccess.can = () => false;
context.AppAccess.unlockAdminAccess = () => { unlockCount++; };
panel.unlockSettingsAccess();
assert.equal(unlockCount, 0, 'Delta disclosure must not unlock Admin access');
panel.setSettingsAccessMode('admin', null);
assert.equal(unlockCount, 1, 'Only selecting Admin unlocks local editing access');
console.log('Delta disclosure leaves access permissions unchanged.');
