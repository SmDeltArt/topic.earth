import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { LocalWorkspace } from '../lib/local-workspace.mjs';
const memory = new Map();
globalThis.localStorage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value), removeItem: key => memory.delete(key) };
const layers = [{ id: 'one' }, { id: 'two' }, { id: 'group' }, { id: 'child', parentLayerId: 'group' }];
LocalWorkspace.move('layers', 'two', -1, layers);
assert.deepEqual(LocalWorkspace.visibleLayers(layers).map(item => item.id), ['two', 'one', 'group', 'child']);
LocalWorkspace.move('layers', 'two', -1, LocalWorkspace.visibleLayers(layers));
assert.equal(LocalWorkspace.visibleLayers(layers)[0].id, 'two');
const topics = [{ id: 1, category: 'one' }, { id: 2, category: 'one' }, { id: 3, category: 'child' }];
LocalWorkspace.move('topics', 2, -1, topics.slice(0, 2));
assert.deepEqual(LocalWorkspace.sort(topics, 'topics').map(item => item.id), [2, 1, 3]);
LocalWorkspace.hide('topics', 1); LocalWorkspace.hide('layers', 'group');
assert.deepEqual(LocalWorkspace.visibleTopics(topics, LocalWorkspace.visibleLayers(layers)).map(item => item.id), [2]);
assert.equal(layers.length, 4); assert.equal(topics.length, 3, 'Source data is retained');
LocalWorkspace.reset(); assert.equal(LocalWorkspace.visibleLayers(layers).length, 4);
assert.equal(LocalWorkspace.visibleTopics(topics, layers).length, 3);

// The actual UI capability helper separates local Admin from verified Super Admin.
const auth = { user: null };
globalThis.__workspaceTestAuth = auth;
const accessSource = (await readFile(new URL('../lib/capabilities.js', import.meta.url), 'utf8'))
  .replace("import { GitHubAuth } from './github-auth.mjs';", 'const GitHubAuth = globalThis.__workspaceTestAuth;');
globalThis.window = { location: { hostname: 'www.topic.earth' } };
const { AppAccess } = await import(`data:text/javascript;base64,${Buffer.from(accessSource).toString('base64')}`);
AppAccess.setMode('user'); assert.equal(AppAccess.can('layer:create'), false);
AppAccess.setMode('admin');
for (const capability of ['layer:create', 'topic:create', 'topic:submit-package', 'topic:export-admin-zip']) assert.equal(AppAccess.can(capability), true);
assert.equal(AppAccess.can('workspace:manage'), false);
assert.equal(AppAccess.can('project:data-write'), false);
auth.user = { role: 'editor' }; assert.equal(AppAccess.can('workspace:manage'), false);
auth.user = { role: 'super-admin' }; assert.equal(AppAccess.getState().isSuperAdmin, true);
assert.equal(AppAccess.can('workspace:manage'), true);
AppAccess.setMode('user'); assert.equal(AppAccess.can('workspace:manage'), false);
AppAccess.setMode('admin'); auth.user = null;
assert.equal(AppAccess.can('workspace:manage'), false, 'Logout removes owner controls');
assert.equal(AppAccess.can('layer:create'), true, 'Logout preserves local Admin authoring');

// Owner controls are absent in ordinary Admin; callbacks recheck the current role.
let invoked = 0;
const panelSource = (await readFile(new URL('../components/LayerPanel.js', import.meta.url), 'utf8'))
  .replace(/^import[\s\S]*?;\r?\n/gm, '').replace('export class LayerPanel', 'class LayerPanel');
const context = vm.createContext({ AppAccess, LocalWorkspace });
vm.runInContext(`${panelSource}\nthis.Panel = LayerPanel;`, context);
const panel = Object.create(context.Panel.prototype);
panel.layers = layers; panel.points = topics; panel.layerFilter = 'main';
panel.callbacks = { onWorkspaceItem() { invoked++; } };
const target = { dataset: { action: 'workspace-item', kind: 'layers', itemId: 'one', operation: 'up' } };
const event = { target: { closest: () => target } };
panel.handleClick(event); assert.equal(invoked, 0);
auth.user = { role: 'super-admin' }; panel.handleClick(event); assert.equal(invoked, 1);
auth.user = null; panel.handleClick(event); assert.equal(invoked, 1);
delete globalThis.window; delete globalThis.__workspaceTestAuth; delete globalThis.localStorage;
console.log('Local Admin creation/export, verified-owner controls, logout, ordering, reversible removal and source preservation passed.');
