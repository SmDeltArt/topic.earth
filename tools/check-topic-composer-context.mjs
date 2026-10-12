import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
let source=await readFile(new URL('../components/LayerPanel.js',import.meta.url),'utf8');
source=source.replace(/^import[^\r\n]*;\r?\n/gm,'').replace('export class LayerPanel','class LayerPanel');
const context=vm.createContext({AppAccess:{canOpenTopicBuilder:()=>true}});
vm.runInContext(source+'\nglobalThis.Panel=LayerPanel;',context);
const panel=Object.create(context.Panel.prototype);
panel.layers=[{id:'world',modeTabs:['main']},{id:'ambassadors',modeTabs:['regional']},{id:'community-projects',modeTabs:['regional']},{id:'space',modeTabs:['space']}];
panel.activeLayers=new Set(['world','space']);panel.regionalActiveLayers=new Set(['ambassadors','community-projects']);panel.expandedLayers=new Set();panel.layerFilter='regional';panel.regionalContext={region:'Wallonia',lat:50.5,lon:5.5};
let request,scrolls=0;
panel.callbacks={onNewTopic:value=>request=value};panel.updateData=()=>{};
panel.container={querySelectorAll:()=>panel.layers.map(layer=>({dataset:{layerId:layer.id},scrollIntoView:()=>scrolls++}))};
panel.composerLayerId='ambassadors';panel.handleNewTopic();
assert.equal(request.defaultLayerId,'ambassadors');assert.equal(request.mode,'regional-proposal');assert.equal(request.regionalContext.region,'Wallonia');assert.ok(panel.expandedLayers.has('ambassadors'));assert.equal(scrolls,1);
// A stale selection from another tab cannot leak into a Space draft.
panel.layerFilter='space';panel.handleNewTopic();assert.equal(request.defaultLayerId,'space');assert.equal(request.mode,'space');
// A disabled layer is replaced by an active layer in the same tab.
panel.layerFilter='regional';panel.regionalActiveLayers.delete('ambassadors');panel.composerLayerId='ambassadors';panel.handleNewTopic();assert.equal(request.defaultLayerId,'community-projects');
console.log('Active tab/layer inheritance, independent Regional state, stale/disabled selection fallback and scroll-to-layer passed.');
