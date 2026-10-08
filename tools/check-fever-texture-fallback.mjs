import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const source = await readFile(new URL('../lib/globe.js', import.meta.url), 'utf8');
const method = source.match(/  async loadFeverTextures\(quality = null\) \{[\s\S]*?\n  \}/)[0];
const requests = [];
const years = [1950,1975,2000,2025,2050,2075,2100,2125];
const context = {
 console:{log(){},error(){}}, FEVER_TEXTURE_ASSET_BASE:'./assets/textures/fever',
 assetPath:(base,file)=>`https://unavailable.example/${file}`,
 resolveAssetPath:()=>null,
 THREE:{SRGBColorSpace:'srgb',RepeatWrapping:1,TextureLoader:class {
  load(path, success, progress, failure){
   requests.push(path);
   if(path.startsWith('https:')) failure(new Error('CDN unavailable'));
   else success({repeat:{},offset:{}});
  }
 }}
};
const loader = vm.runInNewContext(`({${method}})`, context);
Object.assign(loader, {
 normalizeFeverTextureQuality:q=>q,
 textureCache:{fever:new Map()},
 loadFeverScenarioConfig:async()=>{},
 feverScenarioConfig:{years}, feverTextureSets:{},
 renderer:{capabilities:{getMaxAnisotropy:()=>1}}
});
for(const quality of ['1k','4k']) {
 assert.equal(await loader.loadFeverTextures(quality),true);
 assert.equal(loader.feverTextures.length,8);
 for(const year of years) assert.ok(requests.includes(`./assets/textures/fever/earth_${year}_${quality}.png`));
}
console.log('Both Fever resolutions load all packaged milestone textures when CDN URLs fail.');
