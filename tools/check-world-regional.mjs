import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { RegionalLocationManager } from '../lib/regional-location.mjs';
import * as Three from '../vendor/three/three.mjs';

const loadClass = async (path, name, globals = {}) => {
  let source = await readFile(new URL(`../${path}`, import.meta.url), 'utf8');
  source = source.replace(/^import[\s\S]*?;\r?\n/gm, '').replace(`export class ${name}`, `class ${name}`);
  source = source.split('// Initialize application when DOM is ready')[0];
  const context = vm.createContext({ console, RegionalLocationManager, ...globals });
  vm.runInContext(`${source}\nthis.TestClass = ${name};`, context);
  return context.TestClass;
};

assert.equal(RegionalLocationManager.normalize({lat:' ',lon:4}), null);
assert.equal(RegionalLocationManager.normalize({lat:91,lon:4}), null);
assert.equal(RegionalLocationManager.distance({lat:0,lon:0},{lat:0,lon:0}),0);
assert.equal(RegionalLocationManager.distance({lat:null,lon:0},{lat:0,lon:0}),Infinity);
assert.ok((await RegionalLocationManager.resolve('50.63, 5.57')).label);
await assert.rejects(RegionalLocationManager.resolve('95, 5'),/Coordinates/);
const originalFetch=globalThis.fetch;
let calls=0;
globalThis.fetch=async()=>({ok:true,json:async()=>{calls++;return [{lat:'50.63',lon:'5.57',display_name:'Liège, Belgium',address:{city:'Liège',country:'Belgium'}}]}});
assert.equal((await RegionalLocationManager.resolve('Liège')).city,'Liège');
await RegionalLocationManager.resolve('Liège'); assert.equal(calls,1);
globalThis.fetch=originalFetch;

// Exercise the real World texture loader with a stable reference while high-resolution/CDN loads fail.
const globeSource=await readFile(new URL('../lib/globe.js',import.meta.url),'utf8');
const methodNames=['normalizeTextureQualityPreference','getMainBaseColorTextureCandidates','loadCachedTexture','getAutoTextureQuality','detectPreferredQuality'];
const methods=methodNames.map(name=>globeSource.match(new RegExp(`  ${name}\\([^\\n]*\\) \\{[\\s\\S]*?\\n  \\}`))[0]);
let preference='auto';const requests=[];
const context={console:{log(){},error(){}},window:{Settings:{get:()=>({baseTextureQuality:preference})}},MAIN_TEXTURE_ASSET_BASE:'./assets/textures/main',assetPath:(_b,f)=>`https://cdn.example/${f}`,
 THREE:{...Three,TextureLoader:class{load(path,success,_p,failure){requests.push(path);queueMicrotask(()=>path.includes('_1k.jpeg')&&!path.startsWith('https:')?success(new Three.Texture({src:path})):failure(Error('Unavailable')))}}}};
const world=vm.runInNewContext(`({${methods.join(',')}})`,context);
world.renderer={capabilities:{maxTextureSize:4096}};world.getTextureQualitySignals=()=>({browserFamily:'firefox'});
assert.equal(world.detectPreferredQuality(),'1k');preference='8k';assert.equal(world.detectPreferredQuality(),'4k');
for(const quality of ['1k','4k','8k']) {
 const cache=new Map();const paths=world.getMainBaseColorTextureCandidates(quality);
 const texture=world.loadCachedTexture(paths,cache,quality,'Base Color',t=>{t.colorSpace=Three.SRGBColorSpace;});
 assert.equal(world.loadCachedTexture(paths,cache,quality,'Base Color'),texture);
 for(let i=0;i<30&&!texture.image;i++) await Promise.resolve();
 assert.ok(texture.image.src.endsWith('_1k.jpeg'));assert.equal(texture.colorSpace,Three.SRGBColorSpace);assert.equal(cache.get(quality),texture);
}
assert.ok(requests.some(path=>path.includes('_8k.jpeg')));
console.log('World: Firefox Auto, GPU cap, stable cached textures and lower-resolution fallback passed.');

let settings={regionalHomeLocation:null,regionalRadiusKm:0};
const SettingsClass=await loadClass('lib/settings.js','Settings',{localStorage:{getItem:()=>null},window:{location:{hostname:'localhost'}},URL});
assert.equal(SettingsClass.sanitize({regionalRadiusKm:42}).regionalRadiusKm,0);
assert.equal(SettingsClass.sanitize({regionalHomeLocation:{lat:NaN,lon:5}}).regionalHomeLocation,null);
const Panel=await loadClass('components/LayerPanel.js','LayerPanel',{Settings:{get:()=>settings}});
const panel=Object.create(Panel.prototype);panel.layerFilter='regional';panel.regionalContext={lat:50.63,lon:5.57};
panel.layers=[{id:'far',modeTabs:['regional']},{id:'community-projects',modeTabs:['regional']},{id:'regional-examples',modeTabs:['regional']}];
panel.points=[{id:'far',category:'far',lat:40,lon:4},{id:'near',category:'community-projects',lat:50.64,lon:5.58,date:'2020-01-01'},{id:'watch',category:'community-projects',lat:49,lon:5,onlineLayerSignal:true,markerPriority:999,date:'2026-01-01'},{id:'example',category:'regional-examples',lat:50.63,lon:5.57}];
assert.deepEqual(Array.from(panel.getFilteredLayers(),l=>l.id),['community-projects','far','regional-examples']);
assert.equal(panel.getLayerNews(panel.layers[1])[0].id,'near');settings.regionalRadiusKm=25;
assert.deepEqual(Array.from(panel.getLayerNews(panel.layers[1]),p=>p.id),['near']);

const App=await loadClass('app.main.js','TopicEarthApp',{Settings:{get:()=>settings,set:s=>(settings={...settings,...s})},window:{dispatchEvent(){}},CustomEvent:class{constructor(type,options){this.detail=options.detail;}}});
const app=Object.create(App.prototype);app.currentLayerFilter='regional';app.getRegionalZoomFromPrecision=()=>9;app.updateRegionalMobilityCheck=()=>{};app.refreshRealtimeMeteo=()=>{};app.refreshGoodInitiatives=()=>{};
settings.regionalHomeLocation={lat:50.63,lon:5.57,label:'Liège'};
app.handleRegionalContextChange({lat:48.85,lon:2.35,source:'topic',label:'Paris'});
assert.equal(app.regionalContext.label,'Liège');
app.handleRegionalContextChange({lat:50.46,lon:4.86,source:'search',label:'Namur',useAsLocation:true});
assert.equal(settings.regionalHomeLocation.label,'Namur');assert.equal(app.regionalContext.label,'Namur');
app.allLayers=panel.layers;app.allPoints=panel.points;app.regionalContext=panel.regionalContext;
assert.equal(app.getLayerTopicsForNavigation(panel.points[1])[0].id,'near');

const stored=new Map();
const PersistentSettings=await loadClass('lib/settings.js','Settings',{localStorage:{getItem:k=>stored.get(k)||null,setItem:(k,v)=>stored.set(k,v)},window:{location:{hostname:'localhost'}},URL});
PersistentSettings.set({regionalHomeLocation:{lat:50.63,lon:5.57,label:'Liège'},regionalRadiusKm:50});
assert.equal(PersistentSettings.get().regionalHomeLocation.label,'Liège');assert.equal(PersistentSettings.get().regionalRadiusKm,50);
PersistentSettings.set({regionalHomeLocation:null});assert.equal(PersistentSettings.get().regionalHomeLocation,null);
const emitted=[];
const SearchMap=await loadClass('components/RegionalMap.js','RegionalMap',{Settings:{set:s=>s},window:{dispatchEvent:e=>emitted.push(e)},CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail;}}});
const search=Object.create(SearchMap.prototype);search.getCurrentLanguage=()=> 'en';search.setSearchFeedback=()=>{};
search.findTopicByQuery=()=>{throw Error('Location checkbox must not select a fuzzy topic match');};
const form={querySelector:selector=>selector==='#regional-map-search-input'?{value:'50.63, 5.57'}:{checked:true}};
await search.handleSearchSubmit({target:{closest:()=>form},preventDefault(){}});
assert.equal(emitted[0].type,'personalLocationChanged');assert.equal(emitted[0].detail.settings.regionalHomeLocation.lat,50.63);

console.log('Regional: saved-place validation, distance/radius ordering, navigation and pinned home location passed.');

const Detail=await loadClass('components/DetailPanel.js','DetailPanel',{Settings:{get:()=>({})},LanguageManager:{normalizeLanguageCode:()=> 'fr',getLanguageInfo:()=>({nativeName:'Français'})}});
const detail=Object.create(Detail.prototype);detail.mode='detail';detail.currentPoint={id:'regional-topic'};detail.getCurrentLanguage=()=> 'fr';
const read={hidden:true},translate={hidden:true,querySelector:()=>({}),setAttribute(){}};
detail.container={querySelectorAll:()=>[read,translate],querySelector:()=>translate};detail.updateTopicLanguageControls();assert.equal(read.hidden,false);assert.equal(translate.hidden,false);
const css=await readFile(new URL('../styles.css',import.meta.url),'utf8');assert.ok(css.includes('body.regional-mode #detail-panel .detail-toolbar { position: relative'));
const loadData=async path=>import('data:text/javascript;base64,'+Buffer.from(await readFile(new URL(`../${path}`,import.meta.url),'utf8')).toString('base64'));
const {MOCK_POINTS}=await loadData('data/points.js');const {LAYERS}=await loadData('data/layers.js');
assert.ok(MOCK_POINTS.filter(p=>p.originalCategory).every(p=>p.category==='regional-examples'&&p.reviewState==='example'));
assert.equal(LAYERS.find(l=>l.id==='regional-examples').enabled,false);
assert.deepEqual(LAYERS.find(l=>l.id==='country-news').modeTabs,['main']);
console.log('Regional: read/translate availability, toolbar layout and isolated legacy examples passed.');
